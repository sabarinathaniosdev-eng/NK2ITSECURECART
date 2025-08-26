import nodemailer from 'nodemailer';
import { validateEmailEnvironment } from '../lib/environment';



// Create transporter with environment validation
function createEmailTransporter() {
  // If SMTP is configured and environment validates, create a real transporter.
  // Otherwise fall back to a safe JSON transport (no network) so demo/dev won't throw.
  try {
    validateEmailEnvironment();

    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
    const secure = String(port) === '465' || process.env.SMTP_SECURE === 'true';

    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
    });
  } catch (err) {
    // If validation fails (missing env) or in DEMO mode, use a no-op JSON transport so code can continue.
    console.warn('[emailService] SMTP not configured or validation failed — using jsonTransport (demo/dev mode).', err && (err as Error).message);
    return nodemailer.createTransport({ jsonTransport: true });
  }
}

interface EmailInvoiceData {
  email: string;
  invoiceId: string;
  licenseKey: string;
  amountCents: number;
  pdfBuffer: Buffer;
}

export async function sendInvoiceEmail(data: EmailInvoiceData): Promise<void> {
  const transporter = createEmailTransporter();
  
  // amountCents is expected to already include GST when callers pass it (value in cents)
  // Convert cents to dollars for display.
  const totalAmount = (data.amountCents / 100).toFixed(2);
  
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: data.email,
    subject: `NK2IT Invoice ${data.invoiceId} - Symantec License Key`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #FF7A00; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">NK2IT PTY LTD</h1>
          <p style="margin: 5px 0 0 0;">Professional Software Licensing Solutions</p>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333;">Thank you for your purchase!</h2>
          
          <p>Your Symantec Endpoint Protection license has been processed successfully.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #FF7A00; margin-top: 0;">Order Details</h3>
            <p><strong>Invoice ID:</strong> ${data.invoiceId}</p>
            <p><strong>License Key:</strong> <code style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px;">${data.licenseKey}</code></p>
            <p><strong>Total Amount:</strong> $${totalAmount} AUD (inc. GST)</p>
          </div>
          
          <p>Your invoice PDF is attached to this email for your records.</p>
          
          <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; border-left: 4px solid #00A65A;">
            <p style="margin: 0;"><strong>Next Steps:</strong></p>
            <p style="margin: 5px 0 0 0;">Use the license key above to activate your Symantec Endpoint Protection software. If you need assistance, contact our support team.</p>
          </div>
        </div>
        
        <div style="background: #00A65A; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0; font-weight: bold;">Thank you for your purchase! Powered by NK2IT</p>
          <p style="margin: 10px 0 0 0; font-size: 14px;">
            Email: support@nk2it.com.au | Phone: 1300 NK2 IT | Website: nk2it.com.au
          </p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: `NK2IT-Invoice-${data.invoiceId}.pdf`,
        content: data.pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  };

  try {
    // Type cast transporter to any to avoid incompatible overloaded signature errors with different Transporter implementations
    const info = await (transporter as any).sendMail(mailOptions);

    // If using jsonTransport (demo), log the rendered message for debugging.
    if ((info as any)?.message) {
      console.debug('[emailService] sendMail info:', info);
    }

    // If using nodemailer test account / ethereal, output preview URL when available
    if ((info as any)?.previewUrl) {
      console.info('[emailService] Preview URL:', (info as any).previewUrl);
    }
  } catch (err) {
    console.error('[emailService] Failed to send invoice email:', err);
    // Do not rethrow to avoid breaking order flow; calling code will continue.
  }
}