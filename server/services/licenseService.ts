interface LicenseKeyData {
  productId: string | null;      // allow nulls explicitly
  productName: string;
  quantity: number;
  orderId: string;
  orderItemId?: string | null;   // allow optional null
}

// Utility: generates and validates demo license keys for orders
class LicenseService {
  generateLicenseKeys(data: LicenseKeyData): string[] {
    const keys: string[] = [];
    
    for (let i = 0; i < data.quantity; i++) {
      // pass productId through so prefixing works correctly
      const key = this.generateSingleLicenseKey(data.productId);
      keys.push(key);
    }
    
    
    return keys;
  }

  private generateSingleLicenseKey(productId?: string | null): string {
    // Generate license key based on product type
    const productPrefix = this.getProductPrefix(productId ?? null);
    const segments = [
      productPrefix,
      this.generateSegment(5),
      this.generateSegment(5),
      this.generateSegment(5),
      this.generateSegment(4)
    ];
    
    return segments.join('-');
  }

  private getProductPrefix(productId: string | null): string {
    const prefixes: Record<string, string> = {
      'endpoint-protection': 'SEPEP',
      'endpoint-complete': 'SESCO',
    };
    
    return productId ? prefixes[productId] || 'SYMNT' : 'SYMNT';
  }

  private generateSegment(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  validateLicenseKey(licenseKey: string): boolean {
    // Basic validation - check format
    const keyPattern = /^[A-Z0-9]{4,6}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{4}$/;
    return keyPattern.test(licenseKey);
  }

  getProductFromLicenseKey(licenseKey: string): string | null {
    if (!this.validateLicenseKey(licenseKey)) {
      return null;
    }

    const prefix = licenseKey.split('-')[0];
    const productMap: Record<string, string> = {
      'SEPEP': 'endpoint-protection',
      'SESCO': 'endpoint-complete',
    };

    return productMap[prefix] || null;
  }

  async activateLicense(licenseKey: string, customerInfo: any): Promise<boolean> {
    // In a real implementation, this would communicate with Symantec's servers
    // For demo purposes, we'll simulate activation
    if (!this.validateLicenseKey(licenseKey)) {
      return false;
    }

    console.log(`[LicenseService] License activated: ${licenseKey}`);
    console.log(`[LicenseService] Customer: ${customerInfo.email}`);
    
    return true;
  }

  async revokeLicense(licenseKey: string, reason: string = 'User requested'): Promise<boolean> {
    // In a real implementation, this would communicate with Symantec's servers
    console.log(`[LicenseService] License revoked: ${licenseKey} - Reason: ${reason}`);
    return true;
  }

  formatLicenseKeysForEmail(keys: string[], productName: string): { productName: string; keys: string[] } {
    return {
      productName,
      keys
    };
  }

  generateBatchLicenseKeys(orders: Array<{ productId: string; productName: string; quantity: number; orderId: string; orderItemId?: string }>): Array<{ orderId: string; orderItemId?: string; productId: string; keys: string[] }> {
    return orders.map(order => ({
      orderId: order.orderId,
      orderItemId: order.orderItemId,
      productId: order.productId,
      keys: this.generateLicenseKeys(order)
    }));
  }
}

export const licenseService = new LicenseService();
export type { LicenseKeyData };
