// Compatibility wrapper for legacy scripts that call generateInvoicePdf
// Tries to delegate to the new service at ./services/pdfService.ts and falls back
// to a minimal file-writer implementation if the service isn't available.

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

async function generateInvoicePdf(params: { invoiceNo: string; date: string; outPath: string; email?: string | null; licenseKey?: string; amountCents?: number }) {
  const { invoiceNo, date, outPath, email = null, licenseKey = 'NO-LICENSE-KEY', amountCents = 0 } = params;
  // Attempt to delegate to the new TypeScript service
  try {
    // dynamic require so runtime doesn't break if TS module resolution differs
    const pdfService = require('./services/pdfService');
    if (pdfService && typeof pdfService.generateInvoicePDF === 'function') {
      const buffer = await pdfService.generateInvoicePDF({
        id: invoiceNo,
        email: email || 'no-reply@nk2it.com.au',
        licenseKey,
        amountCents
      });

      if (outPath) fs.writeFileSync(outPath, buffer);
      return outPath || buffer;
    }
  } catch (err) {
    // if delegation fails, fall back to the old inline generator below
    // (we keep the fallback to avoid breaking any existing scripts)
    // console.warn('Delegation to services/pdfService failed, using fallback:', err && err.message);
  }

  // --- Fallback: legacy inline PDF writer (kept for compatibility) ---
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const writeStream = fs.createWriteStream(outPath);
  doc.pipe(writeStream);

  // Paths - adjust to actual file in repo (attached_assets)
  const logoPath = path.join(__dirname, '..', '..', 'attached_assets', 'Nk2IT tag Logo_bg remove (1)_1755672419460.png');

  // Header: logo left
  const headerY = 30;
  try {
    doc.image(logoPath, doc.page.margins.left, headerY, { width: 120 });
  } catch (e) {
    // fallback: continue without logo
    // console.warn('Logo not found or unreadable', e && e.message);
  }

  // Right-aligned invoice meta
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const metaX = doc.page.margins.left;
  const metaY = headerY + 6;
  const metaWidth = pageWidth - 140; // leave space for logo (approx)

  doc
    .font('Helvetica-Bold')
    .fontSize(12);

  doc.text('INVOICE', metaX, metaY, { width: metaWidth, align: 'right' });
  doc.font('Helvetica').fontSize(10);
  doc.moveDown(0.2);

  // Robust handling for long invoice numbers: wrap into multiple lines and place Date below
  const invoiceIdRaw = (invoiceNo || '').toString();
  let idFontSize = 10;
  doc.fontSize(idFontSize);

  const approxCharWidth = Math.max(4, idFontSize * 0.6);
  const charsPerLine = Math.max(10, Math.floor(metaWidth / approxCharWidth));

  const idParts: string[] = [];
  for (let i = 0; i < invoiceIdRaw.length; i += charsPerLine) {
    idParts.push(invoiceIdRaw.substring(i, i + charsPerLine));
  }

  const invoiceIdText = idParts.join('\n') || invoiceIdRaw;
  const idY = metaY + 14;
  doc.text(invoiceIdText, { width: metaWidth, align: 'right' });

  // Position Date below the invoice id block
  const afterIdY = (doc.y) ? doc.y : (idY + idParts.length * (idFontSize + 2));
  const dateLabelY = Math.max(metaY + 34, afterIdY + 6);
  doc.text(`Date: ${date}`, metaX, dateLabelY, { width: metaWidth, align: 'right' });

  // Move cursor down and continue building invoice body...
  doc.moveDown(3);

  // Minimal items/totals for fallback (keeps file valid)
  doc.font('Helvetica-Bold').fontSize(12).text('Item', 50, 220);
  doc.font('Helvetica').fontSize(10).text('1 x Symantec Endpoint Protection License', 50, 240);
  doc.font('Helvetica-Bold').text('TOTAL:', 400, 300);
  doc.font('Helvetica').text(`$${(amountCents / 100).toFixed(2)}`, 470, 300);

  doc.end();

  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => resolve(outPath));
    writeStream.on('error', reject);
  });
}

module.exports = { generateInvoicePdf };