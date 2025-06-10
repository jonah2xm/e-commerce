const nodemailer = require("nodemailer");
require('dotenv').config();

const user = process.env.EMAIL_USER && process.env.EMAIL_USER.trim();
const pass = process.env.EMAIL_PASS && process.env.EMAIL_PASS.trim();
// Set up your SMTP transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: user,
    pass: pass,
  },
});

exports.sendWelcomeEmail = async (email, name) => {
  try {
    console.log("email", process.env.EMAIL_PASS);
    const mailOptions = {
      from: process.env.EMAIL_USER, // sender address
      to: email, // list of receivers
      subject: "Welcome to EasyBuy", // Subject line
      text: `Hello ${name},\n\nWelcome to EasyBuy! We're excited to have you on board.\n\nEnjoy shopping and have a great day!`, // plain text body
    };

    // Send the email
    await transporter.sendMail(mailOptions);
    console.log("Welcome email sent to:", email);
  } catch (error) {
    console.error("Error sending welcome email:", error);
  }
};

exports.sendResetPasswordEmail = async (email, resetUrl) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Reset your EasyBuy password",
    html: `
      <p>Hello,</p>
      <p>You requested to reset your password. Click the link below to reset:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>This link is valid for 30 minutes.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};

exports.sendOrderConfirmationEmail = async (email, orderNumber, items, totals) => {
  // Build rows for each item
  const rowsHtml = items
    .map(
      (it) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">${it.name}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center;">${it.quantity}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">${it.price.toFixed(2)} DA</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">${(it.price * it.quantity).toFixed(2)} DA</td>
      </tr>`
    )
    .join("");

  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Order Confirmation</title>
  </head>
  <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;margin:20px 0;border-radius:8px;overflow:hidden;">
            <!-- Header -->
            <tr>
              <td style="background:#0d47a1;padding:20px;text-align:center;color:#ffffff;font-size:24px;">
                🎉 EasyBuy Order Confirmed
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:20px;">
                <p style="font-size:16px;color:#333333;">
                  Hi there,
                </p>
                <p style="font-size:16px;color:#333333;">
                  Thank you for your purchase! Your order <strong>#${orderNumber}</strong> has been confirmed.
                </p>
                <!-- Items Table -->
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:20px;">
                  <thead>
                    <tr>
                      <th style="padding:10px;border:1px solid #ddd;background:#f0f0f0;text-align:left;">Item</th>
                      <th style="padding:10px;border:1px solid #ddd;background:#f0f0f0;text-align:center;">Qty</th>
                      <th style="padding:10px;border:1px solid #ddd;background:#f0f0f0;text-align:right;">Price</th>
                      <th style="padding:10px;border:1px solid #ddd;background:#f0f0f0;text-align:right;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rowsHtml}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colspan="3" style="padding:10px;border:1px solid #ddd;text-align:right;font-weight:bold;">Subtotal</td>
                      <td style="padding:10px;border:1px solid #ddd;text-align:right;">${totals.subtotal.toFixed(2)} DA</td>
                    </tr>
                    <tr>
                      <td colspan="3" style="padding:10px;border:1px solid #ddd;text-align:right;font-weight:bold;">Shipping</td>
                      <td style="padding:10px;border:1px solid #ddd;text-align:right;">${totals.shipping.toFixed(2)} DA</td>
                    </tr>
                    <tr>
                      <td colspan="3" style="padding:10px;border:1px solid #ddd;text-align:right;font-weight:bold;">Tax</td>
                      <td style="padding:10px;border:1px solid #ddd;text-align:right;">${totals.tax.toFixed(2)} DA</td>
                    </tr>
                    <tr>
                      <td colspan="3" style="padding:10px;border:1px solid #ddd;text-align:right;font-size:18px;font-weight:bold;">Total</td>
                      <td style="padding:10px;border:1px solid #ddd;text-align:right;font-size:18px;font-weight:bold;">${totals.total.toFixed(2)} DA</td>
                    </tr>
                  </tfoot>
                </table>

                <p style="font-size:16px;color:#333333;margin-top:20px;">
                  We’ll send you another email when your order ships. If you have any questions, reply to this email.
                </p>
                <p style="font-size:16px;color:#333333;">Happy shopping!<br/>– The EasyBuy Team</p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background:#f0f0f0;padding:15px;text-align:center;font-size:12px;color:#777777;">
                © ${new Date().getFullYear()} EasyBuy. All rights reserved.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  const mailOptions = {
    from: user,
    to: email,
    subject: `Your EasyBuy Order #${orderNumber} is Confirmed!`,
    html,
  };

  await transporter.sendMail(mailOptions);
};

exports.sendOrderUpdateEmail = async (email, orderNumber, status) => {
  // Build the HTML body
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Order Status Update</title>
    </head>
    <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0"
                   style="background:#ffffff;margin:20px 0;border-radius:8px;overflow:hidden;">
              <!-- Header -->
              <tr>
                <td style="background:#0d47a1;padding:20px;text-align:center;color:#ffffff;font-size:24px;">
                  🚚 Order Update
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:20px;">
                  <p style="font-size:16px;color:#333333;">
                    Hi there,
                  </p>
                  <p style="font-size:16px;color:#333333;">
                    Your EasyBuy order <strong>#${orderNumber}</strong> status has been updated to:
                  </p>
                  <p style="font-size:18px;color:#0d47a1;font-weight:bold;margin:20px 0;">
                    ${status.charAt(0).toUpperCase() + status.slice(1)}
                  </p>
                  <p style="font-size:16px;color:#333333;">
                    We’ll let you know as soon as there’s another update.
                  </p>
                  <p style="font-size:16px;color:#333333;">
                    Thank you for shopping with EasyBuy!
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background:#f0f0f0;padding:15px;text-align:center;font-size:12px;color:#777777;">
                  © ${new Date().getFullYear()} EasyBuy. All rights reserved.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const mailOptions = {
    from:    user,
    to:      email,
    subject: `Your EasyBuy Order #${orderNumber} is now "${status}"`,
    html,
  };

  await transporter.sendMail(mailOptions);
};

exports.sendWishlistSaleMail = async (email, product) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Product On Sale</title>
    </head>
    <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0"
                   style="background:#ffffff;margin:20px 0;border-radius:8px;overflow:hidden;">
              <!-- Header -->
              <tr>
                <td style="background:#0d47a1;padding:20px;text-align:center;color:#ffffff;font-size:24px;">
                  🛒 Wishlist Alert: Product On Sale!
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:20px;">
                  <p style="font-size:16px;color:#333333;">
                    Hi there,
                  </p>
                  <p style="font-size:16px;color:#333333;">
                    A product from your wishlist is now <strong>on sale</strong>!
                  </p>
                  <div style="margin:24px 0;padding:16px;background:#f8fafc;border-radius:8px;">
                    <h2 style="color:#0d47a1;margin:0 0 8px 0;">${product.name}</h2>
                    <p style="margin:0 0 8px 0;color:#333;">
                      <span style="text-decoration:line-through;color:#888;">${product.price.toFixed(2)} DA</span>
                      <span style="color:#d32f2f;font-size:20px;font-weight:bold;margin-left:12px;">${product.salePrice.toFixed(2)} DA</span>
                    </p>
                    <p style="margin:0 0 8px 0;color:#333;">
                      <strong>Sale Period:</strong> ${new Date(product.saleStart).toLocaleDateString()} - ${new Date(product.saleEnd).toLocaleDateString()}
                    </p>
                  </div>
                  <p style="font-size:16px;color:#333333;">
                    <a href="${process.env.FRONTEND_URL || "#"}product/${product._id}" style="display:inline-block;padding:12px 24px;background:#0d47a1;color:#fff;text-decoration:none;border-radius:4px;font-weight:bold;margin-top:12px;">
                      View Product
                    </a>
                  </p>
                  <p style="font-size:16px;color:#333333;margin-top:24px;">
                    Happy shopping!<br/>– The EasyBuy Team
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background:#f0f0f0;padding:15px;text-align:center;font-size:12px;color:#777777;">
                  © ${new Date().getFullYear()} EasyBuy. All rights reserved.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Wishlist Alert: "${product.name}" is now on sale!`,
    html,
  };

  await transporter.sendMail(mailOptions);
};