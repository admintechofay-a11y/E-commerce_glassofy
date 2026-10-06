const PDFDocument = require('pdfkit');

/**
 * Generate PDF invoice stream
 * @param {Object} order
 * @param {Object} user
 * @param {Object} res - Express response stream
 */
const generateInvoicePdf = (order, user, res) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  // Stream directly to response
  doc.pipe(res);

  // Header / Branding
  doc.fillColor('#0f172a').fontSize(22).font('Helvetica-Bold').text('GLASSOFY HARDWARE', 40, 40);

  doc
    .fillColor('#64748b')
    .fontSize(10)
    .font('Helvetica')
    .text('Architectural Glass Fittings & Accessories', 40, 68)
    .text('GSTIN: 27AABCU9603R1ZX | contact@glassofy.com', 40, 82);

  // Invoice Details right aligned
  doc
    .fillColor('#0f172a')
    .fontSize(16)
    .font('Helvetica-Bold')
    .text('TAX INVOICE', 350, 40, { align: 'right' });

  doc
    .fillColor('#334155')
    .fontSize(10)
    .font('Helvetica')
    .text(`Invoice No: ${order.orderNumber}`, 350, 65, { align: 'right' })
    .text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, 350, 80, {
      align: 'right',
    })
    .text(`Payment: ${order.paymentMethod} (${order.paymentStatus})`, 350, 95, { align: 'right' });

  doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(40, 115).lineTo(555, 115).stroke();

  // Billing / Shipping addresses
  const startY = 130;
  doc
    .fillColor('#0f172a')
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('Billed & Shipped To:', 40, startY);

  const ship = order.shippingAddress || {};
  doc
    .fillColor('#334155')
    .fontSize(10)
    .font('Helvetica')
    .text(ship.fullName || user?.name || 'Customer', 40, startY + 16)
    .text(ship.line1 || '', 40, startY + 30)
    .text(`${ship.city || ''}, ${ship.state || ''} - ${ship.pincode || ''}`, 40, startY + 44)
    .text(`Phone: ${ship.phone || ''}`, 40, startY + 58);

  if (order.businessName || order.gstNumber) {
    doc
      .fillColor('#0f172a')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('B2B Tax Details:', 350, startY);

    doc
      .fillColor('#334155')
      .fontSize(10)
      .font('Helvetica')
      .text(`Business: ${order.businessName || 'N/A'}`, 350, startY + 16)
      .text(`GSTIN: ${order.gstNumber || 'N/A'}`, 350, startY + 30);
  }

  // Items Table Header
  const tableTop = 210;
  doc.rect(40, tableTop, 515, 24).fill('#f1f5f9');

  doc
    .fillColor('#0f172a')
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('Item Description', 48, tableTop + 7)
    .text('Code', 260, tableTop + 7)
    .text('Qty', 330, tableTop + 7, { align: 'center', width: 40 })
    .text('Price (INR)', 380, tableTop + 7, { align: 'right', width: 70 })
    .text('Total (INR)', 470, tableTop + 7, { align: 'right', width: 75 });

  let itemY = tableTop + 30;

  for (const item of order.items) {
    const desc = `${item.title}${item.finish || item.size ? ` (${[item.finish, item.size].filter(Boolean).join(', ')})` : ''}`;

    doc
      .fillColor('#334155')
      .fontSize(9)
      .font('Helvetica')
      .text(desc, 48, itemY, { width: 200 })
      .text(item.code || '-', 260, itemY)
      .text(String(item.quantity), 330, itemY, { align: 'center', width: 40 })
      .text(item.price.toFixed(2), 380, itemY, { align: 'right', width: 70 })
      .text(item.subtotal.toFixed(2), 470, itemY, { align: 'right', width: 75 });

    itemY += 24;
  }

  doc
    .strokeColor('#e2e8f0')
    .lineWidth(0.5)
    .moveTo(40, itemY + 5)
    .lineTo(555, itemY + 5)
    .stroke();

  // Summary Table
  const summaryY = itemY + 15;
  const colLabelX = 350;
  const colValX = 470;
  const rowH = 18;

  doc.font('Helvetica').fontSize(10).fillColor('#475569');

  doc.text('Subtotal:', colLabelX, summaryY, { width: 110, align: 'right' });
  doc.text(`INR ${order.subtotal.toFixed(2)}`, colValX, summaryY, { width: 75, align: 'right' });

  let curY = summaryY + rowH;

  if (order.discount > 0) {
    doc.fillColor('#16a34a');
    doc.text('Discount:', colLabelX, curY, { width: 110, align: 'right' });
    doc.text(`-INR ${order.discount.toFixed(2)}`, colValX, curY, { width: 75, align: 'right' });
    curY += rowH;
  }

  doc.fillColor('#475569');
  doc.text('GST (18%):', colLabelX, curY, { width: 110, align: 'right' });
  doc.text(`INR ${(order.tax || 0).toFixed(2)}`, colValX, curY, { width: 75, align: 'right' });
  curY += rowH;

  doc.text('Shipping:', colLabelX, curY, { width: 110, align: 'right' });
  doc.text(
    order.shippingFee === 0 ? 'FREE' : `INR ${order.shippingFee.toFixed(2)}`,
    colValX,
    curY,
    {
      width: 75,
      align: 'right',
    }
  );
  curY += rowH;

  doc.rect(colLabelX - 10, curY, 215, 24).fill('#0f172a');
  doc
    .fillColor('#ffffff')
    .font('Helvetica-Bold')
    .fontSize(11)
    .text('Grand Total:', colLabelX, curY + 6, { width: 110, align: 'right' })
    .text(`INR ${order.total.toFixed(2)}`, colValX, curY + 6, { width: 75, align: 'right' });

  // Footer notes
  doc
    .fillColor('#94a3b8')
    .fontSize(8)
    .font('Helvetica')
    .text('This is a computer-generated tax invoice and requires no physical signature.', 40, 760, {
      align: 'center',
      width: 515,
    });

  doc.end();
};

module.exports = {
  generateInvoicePdf,
};
