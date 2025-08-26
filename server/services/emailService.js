const nodemailer = require('nodemailer');
const EmailVerifier = require('./email-verifier');

class EmailService {
  constructor() {
    this.verifier = new EmailVerifier();
    this.transporter = this.createTransporter();
  }

  createTransporter() {
    if (!process.env.SMTP_HOST) {
      console.warn('SMTP not configured - emails will not be sent');
      return null;
    }

    try {
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : null,
      });
    } catch (err) {
      console.error('Failed to create SMTP transporter', err);
      return null;
    }
  }

  async verifyAndSend(to, subject, content) {
    const verification = await this.verifier.verifyEmail(to);

    if (!verification.isValid) {
      throw new Error(`Invalid email address: ${to} (${verification.reason})`);
    }

    if (verification.risk === 'high') {
      throw new Error(`High-risk email address: ${to}`);
    }

    if (!this.transporter) {
      console.log('Email would be sent to:', to);
      return { verified: true, sent: false, verification };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      html: content,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      return {
        verified: true,
        sent: true,
        verification,
        messageId: info.messageId
      };
    } catch (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  async verifyAndSendBulk(recipients) {
    const results = [];
    const emails = recipients.map(r => r.email);
    const verifications = await this.verifier.verifyBatch(emails);

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      const verification = verifications[i];
      try {
        if (verification.isValid && verification.risk !== 'high') {
          const result = await this.verifyAndSend(recipient.email, recipient.subject, recipient.content);
          results.push({ email: recipient.email, status: 'success', result });
        } else {
          results.push({ email: recipient.email, status: 'skipped', reason: 'Invalid or high-risk email', verification });
        }
      } catch (err) {
        results.push({ email: recipient.email, status: 'error', error: err.message });
      }
    }

    return results;
  }
}

module.exports = EmailService;
