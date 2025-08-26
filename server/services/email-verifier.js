const dns = require('dns').promises;

// Basic email format check (RFC5322-lite)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

class EmailVerifier {
  async verifyEmail(email) {
    const result = {
      email: String(email || '').toLowerCase(),
      isValid: false,
      risk: 'unknown', // 'low'|'medium'|'high'
      reason: null,
      mxRecords: []
    };

    if (!email || !EMAIL_RE.test(email)) {
      result.isValid = false;
      result.risk = 'high';
      result.reason = 'invalid_format';
      return result;
    }

    const domain = result.email.split('@')[1];

    try {
      const mx = await dns.resolveMx(domain);
      result.mxRecords = mx.sort((a, b) => a.priority - b.priority).map(r => r.exchange);
      if (mx && mx.length > 0) {
        result.isValid = true;
        result.risk = 'low';
      } else {
        result.isValid = false;
        result.risk = 'medium';
        result.reason = 'no_mx_records';
      }
    } catch (err) {
      // DNS lookup failed — treat as unknown but return details
      result.isValid = false;
      result.risk = 'medium';
      result.reason = 'dns_lookup_failed';
      result._error = String(err && err.message ? err.message : err);
    }

    return result;
  }

  async verifyBatch(emails) {
    const verifier = this;
    return Promise.all((emails || []).map((e) => verifier.verifyEmail(e)));
  }
}

module.exports = EmailVerifier;
