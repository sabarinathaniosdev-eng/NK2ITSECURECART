import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { sendInvoiceEmail } from "./services/emailService";
import { generateInvoicePDF, saveInvoiceRecord } from "./services/pdfService";
import { paymentService } from "./services/paymentService";
import { licenseService } from "./services/licenseService";
import { emailVerificationSchema, otpVerificationSchema, checkoutSchema } from "@shared/schema";
import { randomUUID } from "crypto";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all products
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Get single product
  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // Send OTP for email verification
  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { email } = emailVerificationSchema.parse(req.body);
      
      // Generate 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP
      await storage.createOtpCode({
        email,
        code: otpCode,
        expiresAt,
      });

      // Send OTP email
      // await emailService.sendOTP(email, otpCode); // Disabled for demo

      res.json({ 
        message: "OTP sent successfully",
        email,
        // For demo mode, include the OTP in response
        ...(process.env.NODE_ENV === 'development' && { demoOtp: otpCode })
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error sending OTP:", error);
      res.status(500).json({ message: "Failed to send verification code" });
    }
  });

  // Verify OTP
  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { email, code } = otpVerificationSchema.parse(req.body);
      
      const otpRecord = await storage.getValidOtpCode(email, code);
      if (!otpRecord) {
        return res.status(400).json({ message: "Invalid or expired verification code" });
      }

      // Mark OTP as verified
      await storage.markOtpAsVerified(otpRecord.id);

      res.json({ 
        message: "Email verified successfully",
        verified: true 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error verifying OTP:", error);
      res.status(500).json({ message: "Failed to verify code" });
    }
  });

  // Process checkout and payment
  app.post("/api/checkout", async (req, res) => {
    try {
      const checkoutData = checkoutSchema.parse(req.body);
      
      // Verify email was previously verified (in production, you'd check session/token)
      // For demo, we'll skip this check
      
      // Get products and calculate totals
      const orderItems = [];
      let subtotal = 0;
      
      for (const item of checkoutData.items) {
        const product = await storage.getProduct(item.productId);
        if (!product) {
          return res.status(400).json({ message: `Product ${item.productId} not found` });
        }
        
        const price = parseFloat(product.price);
        const total = price * item.quantity;
        subtotal += total;
        
        orderItems.push({
          productId: product.id,
          productName: product.name,
          price: product.price,
          quantity: item.quantity,
          total: total.toFixed(2),
        });
      }
      
      const gst = subtotal * 0.1;
      const totalAmount = subtotal + gst;
      
      // Generate order ID
      const orderId = `NK2IT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      // Create or get customer
      let customer = await storage.getCustomerByEmail(checkoutData.email);
      if (!customer) {
        customer = await storage.createCustomer({
          email: checkoutData.email,
          firstName: checkoutData.billing.firstName,
          lastName: checkoutData.billing.lastName,
          company: checkoutData.billing.company,
          phone: checkoutData.billing.phone,
        });
      }
      
      // Create order
      const order = await storage.createOrder({
        id: orderId,
        customerId: customer.id,
        email: checkoutData.email,
        status: "processing",
        subtotal: subtotal.toFixed(2),
        gst: gst.toFixed(2),
        total: totalAmount.toFixed(2),
        paymentMethod: "credit_card",
        paymentStatus: "pending",
        billingAddress: checkoutData.billing,
      });
      
      // Create order items
      const createdItems = [];
      for (const item of orderItems) {
        const orderItem = await storage.createOrderItem({
          orderId: order.id,
          ...item,
        });
        createdItems.push(orderItem);
      }
      
      // Process payment
      const paymentResult = await paymentService.processPayment({
        cardNumber: checkoutData.payment.cardNumber,
        expiryDate: checkoutData.payment.expiryDate,
        cvv: checkoutData.payment.cvv,
        cardholderName: checkoutData.payment.cardholderName,
        amount: totalAmount,
        currency: 'AUD',
        orderId: order.id,
        customerEmail: checkoutData.email,
        billingAddress: {
          ...checkoutData.billing,
          country: 'Australia',
        },
      });
      
      if (paymentResult.success) {
        // Update order status
        await storage.updateOrderStatus(order.id, "completed", paymentResult.transactionId);
        
        // Generate license keys
        const licenseKeysData = [];
        for (const item of createdItems) {
          const keys = licenseService.generateLicenseKeys({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            orderId: order.id,
            orderItemId: item.id,
          });
          
          // Store license keys
          for (const key of keys) {
            await storage.createLicenseKey({
              orderId: order.id,
              orderItemId: item.id || '',
              productId: item.productId,
              licenseKey: key || '',
            });
          }
          
          licenseKeysData.push({
            productName: item.productName,
            keys,
          });
        }
        
        // Generate and send invoice via email
        try {
          // Use totalAmount (includes GST) for invoice generation and emailing
          const invoiceAmountCents = Math.round(totalAmount * 100);

          const pdfBuffer = await generateInvoicePDF({
            id: order.id,
            email: checkoutData.email,
            licenseKey: licenseKeysData[0]?.keys[0] || "DEMO-LICENSE-KEY",
            amountCents: invoiceAmountCents
          });

          // Save invoice record to database
          const gstCents = Math.round(gst * 100);
          const pdfFileName = `NK2IT-Invoice-${order.id}.pdf`;
          
          await saveInvoiceRecord({
            id: order.id,
            email: checkoutData.email,
            licenseKey: licenseKeysData[0]?.keys[0] || "DEMO-LICENSE-KEY",
            amountCents: invoiceAmountCents
          }, gstCents, pdfFileName);

          // Send email with PDF attachment using the same invoice amount
          await sendInvoiceEmail({
            email: checkoutData.email,
            invoiceId: order.id,
            licenseKey: licenseKeysData[0]?.keys[0] || "DEMO-LICENSE-KEY",
            amountCents: invoiceAmountCents,
            pdfBuffer
          });
        } catch (emailError) {
          console.error("Email sending failed:", emailError);
          // Continue anyway - order was successful
        }
        
        res.json({
          success: true,
          orderId: order.id,
          transactionId: paymentResult.transactionId,
          licenseKeys: licenseKeysData,
          total: totalAmount,
        });
      } else {
        // Update order status to failed
        await storage.updateOrderStatus(order.id, "failed");
        
        res.status(400).json({
          success: false,
          message: paymentResult.error || "Payment processing failed",
          orderId: order.id,
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error processing checkout:", error);
      res.status(500).json({ message: "Failed to process order" });
    }
  });

  // Get order details
  app.get("/api/orders/:orderId", async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      const items = await storage.getOrderItems(order.id);
      const licenseKeys = await storage.getLicenseKeysByOrder(order.id);
      const customer = await storage.getCustomer(order.customerId!);
      
      res.json({
        order,
        items,
        licenseKeys,
        customer,
      });
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  // Generate and download invoice PDF using query params
  app.get("/api/invoice", async (req, res) => {
    try {
      const { id, email, licenseKey, amountCents } = req.query;
      
      if (!id || !email || !licenseKey || !amountCents) {
        return res.status(400).json({ 
          message: "Missing required parameters: id, email, licenseKey, amountCents" 
        });
      }

      const pdfBuffer = await generateInvoicePDF({
        id: id as string,
        email: email as string,
        licenseKey: licenseKey as string,
        amountCents: parseInt(amountCents as string)
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="NK2IT-Invoice-${id}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating invoice PDF:", error);
      res.status(500).json({ message: "Failed to generate invoice" });
    }
  });

  // Generate and download invoice PDF by order ID
  app.get("/api/orders/:orderId/invoice", async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      const items = await storage.getOrderItems(order.id);
      const licenseKeys = await storage.getLicenseKeysByOrder(order.id);
      const customer = await storage.getCustomer(order.customerId!);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      // Group license keys by product
      const licenseKeysByProduct: { [key: string]: string[] } = {};
      for (const license of licenseKeys) {
        const item = items.find(i => i.id === license.orderItemId);
        if (item) {
          if (!licenseKeysByProduct[item.productName]) {
            licenseKeysByProduct[item.productName] = [];
          }
          licenseKeysByProduct[item.productName].push(license.licenseKey);
        }
      }
      
      const licenseKeysForPdf = Object.entries(licenseKeysByProduct).map(([productName, keys]) => ({
        productName,
        keys,
      }));
      
      // Use the new PDF generation service and pass order.total (includes GST)
      const pdfBuffer = await generateInvoicePDF({
        id: order.id,
        email: customer.email,
        licenseKey: licenseKeysForPdf[0]?.keys[0] || "NO-LICENSE-KEY",
        amountCents: Math.round(parseFloat(order.total) * 100)
      });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="NK2IT-Invoice-${order.id}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating invoice:", error);
      res.status(500).json({ message: "Failed to generate invoice" });
    }
  });

  // Email invoice
  app.post("/api/orders/:orderId/email-invoice", async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      const items = await storage.getOrderItems(order.id);
      const licenseKeys = await storage.getLicenseKeysByOrder(order.id);
      const customer = await storage.getCustomer(order.customerId!);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      // Group license keys by product
      const licenseKeysByProduct: { [key: string]: string[] } = {};
      for (const license of licenseKeys) {
        const item = items.find(i => i.id === license.orderItemId);
        if (item) {
          if (!licenseKeysByProduct[item.productName]) {
            licenseKeysByProduct[item.productName] = [];
          }
          licenseKeysByProduct[item.productName].push(license.licenseKey);
        }
      }
      
      const licenseKeysForPdf = Object.entries(licenseKeysByProduct).map(([productName, keys]) => ({
        productName,
        keys,
      }));
      
      // Generate PDF and send email
      const invoiceAmountCents = Math.round(parseFloat(order.total) * 100);

      const pdfBuffer = await generateInvoicePDF({
        id: order.id,
        email: customer.email,
        licenseKey: licenseKeysForPdf[0]?.keys[0] || "NO-LICENSE-KEY",
        amountCents: invoiceAmountCents,
      });

      await sendInvoiceEmail({
        email: customer.email,
        invoiceId: order.id,
        licenseKey: licenseKeysForPdf[0]?.keys[0] || "NO-LICENSE-KEY",
        amountCents: invoiceAmountCents,
        pdfBuffer,
      });

      res.json({ message: "Invoice sent successfully" });
    } catch (error) {
      console.error("Error sending invoice:", error);
      res.status(500).json({ message: "Failed to send invoice" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
