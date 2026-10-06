const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = async () => {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // In dev / test mode, use Ethereal or create a mock transporter
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log(`[Email] Ethereal mailer initialized for user: ${testAccount.user}`);
    } catch {
      // Fallback stub if internet or Ethereal unavailable
      transporter = {
        sendMail: async (opts) => {
          console.log(`[Mock Email] To: ${opts.to} | Subject: ${opts.subject}`);
          return { messageId: `mock_${Date.now()}` };
        },
      };
    }
  }

  return transporter;
};

/**
 * Send order confirmation email
 * @param {Object} order - Full order object
 * @param {Object} user - User object
 */
const sendOrderConfirmationEmail = async (order, user) => {
  try {
    const mailer = await getTransporter();
    const recipientEmail = user?.email || order?.shippingAddress?.email || 'trade@glassofy.com';
    const recipientName = user?.name || order?.shippingAddress?.fullName || 'Customer';

    const itemsHtml = order.items
      .map(
        (item) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
            <strong>${item.title}</strong>
            ${item.code ? `<br/><small style="color: #6b7280;">Code: ${item.code}</small>` : ''}
            ${item.size || item.finish ? `<br/><small style="color: #6b7280;">${[item.size, item.finish].filter(Boolean).join(' | ')}</small>` : ''}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${item.price.toFixed(2)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${item.subtotal.toFixed(2)}</td>
        </tr>`
      )
      .join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <div style="background-color: #0f172a; color: #ffffff; padding: 20px; border-radius: 6px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">GLASSOFY</h1>
          <p style="margin: 4px 0 0 0; font-size: 14px; color: #94a3b8;">Premium Architectural Hardware</p>
        </div>

        <div style="padding: 20px 0;">
          <h2 style="color: #1e293b; margin-top: 0;">Order Confirmation</h2>
          <p>Dear ${recipientName},</p>
          <p>Thank you for choosing Glassofy. Your order has been placed and is currently being processed.</p>

          <div style="background-color: #f8fafc; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px;">
            <p style="margin: 4px 0;"><strong>Order Number:</strong> ${order.orderNumber}</p>
            <p style="margin: 4px 0;"><strong>Payment Method:</strong> ${order.paymentMethod}</p>
            <p style="margin: 4px 0;"><strong>Payment Status:</strong> ${order.paymentStatus}</p>
            <p style="margin: 4px 0;"><strong>Order Status:</strong> ${order.orderStatus}</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f1f5f9; text-align: left;">
                <th style="padding: 8px;">Item</th>
                <th style="padding: 8px; text-align: center;">Qty</th>
                <th style="padding: 8px; text-align: right;">Price</th>
                <th style="padding: 8px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="padding: 8px; text-align: right; font-weight: bold;">Subtotal:</td>
                <td style="padding: 8px; text-align: right;">₹${order.subtotal.toFixed(2)}</td>
              </tr>
              ${
                order.discount > 0
                  ? `<tr>
                <td colspan="3" style="padding: 8px; text-align: right; color: #16a34a; font-weight: bold;">Discount:</td>
                <td style="padding: 8px; text-align: right; color: #16a34a;">-₹${order.discount.toFixed(2)}</td>
              </tr>`
                  : ''
              }
              <tr>
                <td colspan="3" style="padding: 8px; text-align: right;">GST (18%):</td>
                <td style="padding: 8px; text-align: right;">₹${(order.tax || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="3" style="padding: 8px; text-align: right;">Shipping:</td>
                <td style="padding: 8px; text-align: right;">${order.shippingFee === 0 ? 'FREE' : `₹${order.shippingFee.toFixed(2)}`}</td>
              </tr>
              <tr style="font-size: 16px;">
                <td colspan="3" style="padding: 8px; text-align: right; font-weight: bold; border-top: 2px solid #0f172a;">Grand Total:</td>
                <td style="padding: 8px; text-align: right; font-weight: bold; border-top: 2px solid #0f172a;">₹${order.total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          <div style="background-color: #f8fafc; padding: 12px 16px; border-radius: 6px;">
            <h4 style="margin: 0 0 8px 0; color: #1e293b;">Shipping Address</h4>
            <p style="margin: 2px 0;">${order.shippingAddress.fullName}</p>
            <p style="margin: 2px 0;">${order.shippingAddress.line1}${order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}</p>
            <p style="margin: 2px 0;">${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}</p>
            <p style="margin: 2px 0;">Phone: ${order.shippingAddress.phone}</p>
          </div>
        </div>

        <div style="text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
          <p>© ${new Date().getFullYear()} Glassofy Architectural Hardware. All rights reserved.</p>
        </div>
      </div>
    `;

    const info = await mailer.sendMail({
      from: '"Glassofy Hardware" <orders@glassofy.com>',
      to: recipientEmail,
      subject: `Order Confirmation - ${order.orderNumber}`,
      html,
    });

    if (process.env.NODE_ENV !== 'test' && nodemailer.getTestMessageUrl && info) {
      const url = nodemailer.getTestMessageUrl(info);
      if (url) {
        console.log(`[Email] View preview at: ${url}`);
      }
    }

    return info;
  } catch (err) {
    console.error('[Email] Failed to send order confirmation email:', err.message);
    return null;
  }
};

/**
 * Send email notification to admin when a new draft is created via WhatsApp
 */
const sendAdminWhatsAppDraftNotification = async ({ product, senderMobile, senderName }) => {
  try {
    const mailer = await getTransporter();
    const adminEmail =
      process.env.WHATSAPP_NOTIFY_EMAIL || process.env.ADMIN_EMAIL || 'admin@glassofy.com';
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; background: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; border-bottom: 2px solid #d97706; padding-bottom: 8px;">New WhatsApp Product Draft</h2>
        <p>A new product draft has been uploaded via WhatsApp and is awaiting admin review.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; font-weight: bold; width: 120px;">Product Name:</td><td style="padding: 8px;">${product.name}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Product Code:</td><td style="padding: 8px;">${product.code || 'N/A'}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Base Price:</td><td style="padding: 8px;">₹${product.basePrice}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Uploaded By:</td><td style="padding: 8px;">${senderName || 'Authorized Fabricator'} (${senderMobile})</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Status:</td><td style="padding: 8px; color: #d97706; font-weight: bold;">DRAFT</td></tr>
        </table>
        <div style="margin-top: 24px;">
          <a href="${clientUrl}/admin/whatsapp-inbox" style="background-color: #d97706; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; display: inline-block;">
            Open WhatsApp Inbox
          </a>
        </div>
      </div>
    `;

    const info = await mailer.sendMail({
      from: '"Glassofy Alerts" <alerts@glassofy.com>',
      to: adminEmail,
      subject: `[Glassofy] New WhatsApp Product Draft: ${product.name}`,
      html,
    });
    return info;
  } catch (err) {
    console.error('[Email] Failed to send admin WhatsApp draft alert:', err.message);
    return null;
  }
};

module.exports = {
  sendOrderConfirmationEmail,
  sendAdminWhatsAppDraftNotification,
};

