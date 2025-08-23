import { type Customer, type InsertCustomer, type Order, type InsertOrder, type OrderItem, type InsertOrderItem, type LicenseKey, type InsertLicenseKey, type Product, type OtpCode, type InsertOtpCode, type Address, type InsertAddress } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;

  // Customers
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomerByEmail(email: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;

  // Addresses
  createAddress(address: InsertAddress): Promise<Address>;

  // Orders
  createOrder(order: InsertOrder): Promise<Order>;
  getOrder(id: string): Promise<Order | undefined>;
  updateOrderStatus(id: string, status: string, paymentReference?: string): Promise<void>;

  // Order Items
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;
  getOrderItems(orderId: string): Promise<OrderItem[]>;

  // License Keys
  createLicenseKey(license: InsertLicenseKey): Promise<LicenseKey>;
  getLicenseKeysByOrder(orderId: string): Promise<LicenseKey[]>;

  // OTP Codes
  createOtpCode(otp: InsertOtpCode): Promise<OtpCode>;
  getValidOtpCode(email: string, code: string): Promise<OtpCode | undefined>;
  markOtpAsVerified(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private products: Map<string, Product> = new Map();
  private customers: Map<string, Customer> = new Map();
  private addresses: Map<string, Address> = new Map();
  private orders: Map<string, Order> = new Map();
  private orderItems: Map<string, OrderItem> = new Map();
  private licenseKeys: Map<string, LicenseKey> = new Map();
  private otpCodes: Map<string, OtpCode> = new Map();

  constructor() {
    this.initializeProducts();
  }

  private initializeProducts() {
    const products: Product[] = [
      {
        id: "endpoint-protection",
        name: "Symantec Endpoint Protection Enterprise",
        description: "Comprehensive endpoint security with advanced threat protection for enterprise environments.",
        price: "89.99",
        features: [
          "Advanced malware protection",
          "Real-time threat detection",
          "Centralized management console",
          "Network and email protection",
          "Device and application control"
        ],
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: "endpoint-complete",
        name: "Symantec Endpoint Security Complete",
        description: "Complete security suite with EDR, threat hunting, and advanced analytics capabilities.",
        price: "149.99",
        features: [
          "Everything in Enterprise +",
          "Endpoint Detection & Response (EDR)",
          "Advanced threat hunting",
          "Behavioral forensics",
          "AI-driven adaptive protection",
          "Global Intelligence Network"
        ],
        isActive: true,
        createdAt: new Date(),
      }
    ];

    products.forEach(product => {
      this.products.set(product.id, product);
    });
  }

  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values()).filter(p => p.isActive);
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    return Array.from(this.customers.values()).find(customer => customer.email === email);
  }

      async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const id = randomUUID();
    const customer: Customer = {
      ...insertCustomer,
      id,
      company: insertCustomer.company ?? null,
      phone: insertCustomer.phone ?? null,
      createdAt: new Date(),
    };
    this.customers.set(id, customer);
    return customer;
  }

  async createAddress(insertAddress: InsertAddress): Promise<Address> {
    const id = randomUUID();
    const address: Address = {
      ...insertAddress,
      id,
      customerId: insertAddress.customerId,
      country: insertAddress.country || "Australia",
    };
    this.addresses.set(id, address);
    return address;
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const order: Order = {
      ...insertOrder,
      customerId: insertOrder.customerId || null,
      paymentMethod: insertOrder.paymentMethod || null,
      paymentStatus: insertOrder.paymentStatus || null,
      paymentReference: insertOrder.paymentReference || null,
      createdAt: new Date(),
    };
    this.orders.set(order.id, order);
    return order;
  }

  async getOrder(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async updateOrderStatus(id: string, status: string, paymentReference?: string): Promise<void> {
    const order = this.orders.get(id);
    if (order) {
      order.status = status;
      order.paymentStatus = status;
      if (paymentReference) {
        order.paymentReference = paymentReference;
      }
      this.orders.set(id, order);
    }
  }

  async createOrderItem(insertItem: InsertOrderItem): Promise<OrderItem> {
    const id = randomUUID();
    const item: OrderItem = {
      ...insertItem,
      id,
      productId: insertItem.productId || null,
      orderId: insertItem.orderId || null,
    };
    this.orderItems.set(id, item);
    return item;
  }

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return Array.from(this.orderItems.values()).filter(item => item.orderId === orderId);
  }

  async createLicenseKey(insertLicense: InsertLicenseKey): Promise<LicenseKey> {
    const id = randomUUID();
    const license: LicenseKey = {
      ...insertLicense,
      id,
      productId: insertLicense.productId || null,
      orderId: insertLicense.orderId || null,
      orderItemId: insertLicense.orderItemId || null,
      status: insertLicense.status || "active",
      createdAt: new Date(),
    };
    this.licenseKeys.set(id, license);
    return license;
  }

  async getLicenseKeysByOrder(orderId: string): Promise<LicenseKey[]> {
    return Array.from(this.licenseKeys.values()).filter(license => license.orderId === orderId);
  }

  async createOtpCode(insertOtp: InsertOtpCode): Promise<OtpCode> {
    const id = randomUUID();
    const otp: OtpCode = {
      ...insertOtp,
      id,
      verified: false,
      createdAt: new Date(),
    };
    this.otpCodes.set(id, otp);
    return otp;
  }

  async getValidOtpCode(email: string, code: string): Promise<OtpCode | undefined> {
    const now = new Date();
    return Array.from(this.otpCodes.values()).find(
      otp => otp.email === email && otp.code === code && otp.expiresAt > now && !otp.verified
    );
  }

  async markOtpAsVerified(id: string): Promise<void> {
    const otp = this.otpCodes.get(id);
    if (otp) {
      otp.verified = true;
      this.otpCodes.set(id, otp);
    }
  }
}

export const storage = new MemStorage();
