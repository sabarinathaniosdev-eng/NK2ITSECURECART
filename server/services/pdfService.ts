import PDFDocument from "pdfkit";
import { PrismaClient } from "@prisma/client";
import path from 'path';

const prisma = new PrismaClient();

interface InvoiceData {
   id: string;
   email: string;
   licenseKey: string;
   amountCents: number;
}

export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
   const doc = new PDFDocument({ margin: 50 });
   const chunks: Buffer[] = [];

   // Collect PDF stream into buffer
   doc.on("data", (chunk: Buffer) => chunks.push(chunk));

   return new Promise((resolve, reject) => {
      doc.on("end", () => {
         const pdfBuffer = Buffer.concat(chunks);
         resolve(pdfBuffer);
      });

      doc.on("error", reject);

      // Calculate GST (10%)
      const gstCents = Math.round(data.amountCents * 0.1);
      const totalCents = data.amountCents + gstCents;

      // --- Header with centered logo and right-aligned invoice metadata ---
      const headerY = 40;
      const logoWidth = 140;
      const leftX = doc.page.margins.left;
      const pageWidth = doc.page.width;

      // Draw centered logo
      const logoPath = path.join(__dirname, "..", "..", "attached_assets", "Nk2IT tag Logo_bg remove (1)_1755672419460.png");
      try {
         const centerX = pageWidth / 2;
         doc.image(logoPath, centerX - logoWidth / 2, headerY, { width: logoWidth });
      } catch (e) {
         // continue without logo
      }

      // Small gap below logo
      const afterLogoY = headerY +  (logoWidth * 0.35) + 8; // approximate logo height

      // INVOICE title under logo (centered)
      doc.fillColor("#FF7A00")
         .font("Helvetica-Bold")
         .fontSize(22)
         .text("INVOICE", leftX, afterLogoY, { width: pageWidth - doc.page.margins.left - doc.page.margins.right, align: 'center' });

      // Company details (left column)
      const companyX = leftX;
      const companyY = afterLogoY + 36;
      doc.fillColor("#000000")
         .fontSize(12)
         .font("Helvetica-Bold")
         .text("NK2IT PTY LTD", companyX, companyY);

      doc.font("Helvetica").fontSize(10);
      doc.text("222, 20B Lexington Drive", companyX, companyY + 18);
      doc.text("Norwest Business Park", companyX, companyY + 32);
      doc.text("Baulkham Hills NSW 2153", companyX, companyY + 46);

      // Invoice metadata (right column) - ensure separate lines and no mixing
      const rightColWidth = 220;
      const rightColX = pageWidth - doc.page.margins.right - rightColWidth;
      const metaY = companyY;

      // Prepare date and id
      const currentDate = new Date().toLocaleDateString("en-AU");
      const invoiceIdRaw = (data.id || '').toString();

      // Determine a font size and split the text into lines that fit the right column
      let idFontSize = 10;
      doc.font("Helvetica").fontSize(idFontSize);
      while (idFontSize > 6 && doc.widthOfString(invoiceIdRaw) > rightColWidth) {
        idFontSize -= 1;
        doc.fontSize(idFontSize);
      }

      // Compute a conservative charsPerLine fallback based on font size
      const approxCharWidth = Math.max(4, idFontSize * 0.6); // conservative
      const charsPerLine = Math.max(10, Math.floor(rightColWidth / approxCharWidth));

      // Use pdfkit's splitting helper when available, otherwise split by fixed chunk size
      let lines: string[] = [];
      if ((doc as any).splitTextToSize && typeof (doc as any).splitTextToSize === 'function') {
        lines = (doc as any).splitTextToSize(invoiceIdRaw, rightColWidth);
      } else {
        // Fallback: split into chunks of charsPerLine
        for (let i = 0; i < invoiceIdRaw.length; i += charsPerLine) {
          lines.push(invoiceIdRaw.substring(i, i + charsPerLine));
        }
      }

      // Debug logging to help diagnose layout issues
      try {
        console.debug('[PDF] invoiceIdRaw.length=', invoiceIdRaw.length, 'idFontSize=', idFontSize, 'charsPerLine=', charsPerLine, 'lines=', lines.length);
      } catch (e) {
        // ignore
      }

      // Render metadata labels and values right-aligned with stronger spacing
      const labelFontSize = 12; // slightly larger label for clarity
      const labelY = metaY; // top of metadata block
      doc.font("Helvetica-Bold").fontSize(labelFontSize).text('INVOICE NUMBER:', rightColX, labelY, { width: rightColWidth, align: 'right' });

      // Position invoice id below the label with a comfortable gap
      const idY = labelY + labelFontSize + 6;
      doc.font("Helvetica").fontSize(idFontSize);

      // Render the wrapped invoice id as a single multi-line string so we can measure its height
      const invoiceIdText = lines.join('\n');
      doc.text(invoiceIdText, rightColX, idY, { width: rightColWidth, align: 'right' });

      // Measure the rendered height for the invoice id block and place Date below it
      const invoiceIdHeight = invoiceIdText ? doc.heightOfString(invoiceIdText, { width: rightColWidth, align: 'right' }) : 0;
      const dateLabelY = idY + invoiceIdHeight + 8; // add a small gap

      try {
        console.debug('[PDF] invoiceIdHeight=', invoiceIdHeight, 'labelY=', labelY, 'idY=', idY, 'dateLabelY=', dateLabelY);
      } catch (e) {
        // ignore
      }

      doc.font("Helvetica-Bold").fontSize(10).text('Date:', rightColX, dateLabelY, { width: rightColWidth, align: 'right' });
      doc.font("Helvetica").fontSize(10).text(currentDate, rightColX, dateLabelY + 14, { width: rightColWidth, align: 'right' });

      // --- End header ---

      // Bill To section
      doc.fontSize(14).font("Helvetica-Bold").text("BILL TO", 50, companyY + 80);

      doc.fontSize(12).font("Helvetica").text(`Email: ${data.email}`, 50, companyY + 105);

      // Product table header
      const tableTop = 280;
      doc.fontSize(12)
         .font("Helvetica-Bold")
         .text("NO", 50, tableTop)
         .text("QUANTITY", 90, tableTop)
         .text("PRODUCT DESCRIPTION", 160, tableTop)
         .text("UNIT PRICE", 380, tableTop)
         .text("TOTAL PRICE", 470, tableTop);

      // Table line
      doc.moveTo(50, tableTop + 20)
         .lineTo(550, tableTop + 20)
         .stroke();

      // Product row
      const productRow = tableTop + 30;
      doc.fontSize(12)
         .font("Helvetica")
         .text("1", 50, productRow)
         .text("1", 90, productRow)
         .text("Symantec Endpoint Protection License", 160, productRow)
         .text(`$${(data.amountCents / 100).toFixed(2)}`, 380, productRow)
         .text(`$${(data.amountCents / 100).toFixed(2)}`, 470, productRow);

      // License key section
      doc.fontSize(12)
         .font("Helvetica-Bold")
         .text("License Key:", 50, productRow + 40)
         .font("Helvetica")
         .text(data.licenseKey, 140, productRow + 40);

      // Totals section
      const totalsY = productRow + 80;
      doc.text("AMOUNT:", 400, totalsY)
         .text(`$${(data.amountCents / 100).toFixed(2)}`, 470, totalsY)
         .text("GST (10%):", 400, totalsY + 20)
         .text(`$${(gstCents / 100).toFixed(2)}`, 470, totalsY + 20)
         .font("Helvetica-Bold")
         .text("TOTAL:", 400, totalsY + 40)
         .text(`$${(totalCents / 100).toFixed(2)}`, 470, totalsY + 40);

      // Terms & Conditions
      const termsY = totalsY + 100;
      doc.fontSize(14)
         .font("Helvetica-Bold")
         .text("TERMS & CONDITIONS:", 50, termsY);

      const termsText = [
         "Payment Terms: Once the payment is processed, a license key will be sent to the registered email address.",
         "",
         "Refund Policy: All sales are final. No refunds will be issued after the software has been purchased or delivered.",
         "If the software is defective or an incorrect product is delivered, please contact customer support within 7 days.",
         "",
         "License Terms: The purchase provides a non-transferable license to use the Symantec Endpoint Agent software.",
         "Ownership remains with Symantec and is subject to the terms of the EULA (End-User License Agreement).",
         "",
         "Support: Basic customer support is available through support@nk2it.com.au. If you require extended support,",
         "you must coordinate with respective vendors.",
         "",
         "Limitation of Liability: Our liability is limited to the purchase price of the software. We are not responsible",
         "for any consequential, incidental, or indirect damages arising from the use or inability to use the software.",
      ];

      let currentY = termsY + 30;
      doc.fontSize(10).font("Helvetica");

      termsText.forEach((line) => {
         if (line === "") {
            currentY += 10;
         } else {
            doc.text(line, 50, currentY, { width: 500 });
            currentY += 15;
         }
      });

      // Footer with green color
      const footerY = doc.page.height - 80;
      doc.fillColor("#00A65A")
         .fontSize(14)
         .font("Helvetica-Bold")
         .text("Thank you for your purchase! Powered by NK2IT", 50, footerY, {
            width: 500,
            align: "center",
         });

      // Contact info
      doc.fillColor("#000000")
         .fontSize(10)
         .font("Helvetica")
         .text(
            "Email: support@nk2it.com.au | Phone: 1300 NK2 IT | Website: nk2it.com.au",
            50,
            footerY + 30,
            {
               width: 500,
               align: "center",
            },
         );

      doc.end();
   });
}

export async function saveInvoiceRecord(
   data: InvoiceData,
   gstCents: number,
   pdfFileName: string,
) {
   return await prisma.invoice.create({
      data: {
         id: data.id,
         userEmail: data.email,
         amountCents: data.amountCents,
         gstCents,
         licenseKey: data.licenseKey,
         pdfFileName,
         createdAt: new Date(),
      },
   });
}
