import "server-only";
import { Resend } from "resend";

// Only initialize Resend if API key is available
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.FROM_EMAIL || "orders@keesdeen.com";
const COMPANY_NAME = "Keesdeen";

interface OrderConfirmationData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  lines: {
    title: string;
    variantTitle: string;
    quantity: number;
    price: number;
  }[];
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  grandTotal: number;
  shippingAddress: {
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  currency: string;
}

/**
 * Format price for email display.
 */
function formatPrice(cents: number, currency: string = "GBP"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

/**
 * Send order confirmation email.
 */
export async function sendOrderConfirmationEmail(
  data: OrderConfirmationData,
): Promise<boolean> {
  const { shippingAddress } = data;
  const addressLine = [
    `${shippingAddress.firstName} ${shippingAddress.lastName}`,
    shippingAddress.address1,
    shippingAddress.address2,
    `${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postalCode}`,
    shippingAddress.country,
  ]
    .filter(Boolean)
    .join("<br>");

  const lineItemsHtml = data.lines
    .map(
      (line) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #E0E0E0;">
          <strong>${line.title}</strong><br>
          <span style="color: #666; font-size: 14px;">${line.variantTitle}</span>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #E0E0E0; text-align: center;">
          ${line.quantity}
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #E0E0E0; text-align: right;">
          ${formatPrice(line.price * line.quantity, data.currency)}
        </td>
      </tr>
    `,
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #F9F9F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <tr>
          <td>
            <!-- Header -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
              <tr>
                <td style="text-align: center;">
                  <h1 style="font-family: Georgia, serif; font-size: 28px; color: #1A1A1A; margin: 0;">
                    ${COMPANY_NAME}
                  </h1>
                </td>
              </tr>
            </table>

            <!-- Main Card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
              <tr>
                <td style="padding: 32px;">
                  <!-- Order Confirmed Banner -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background: #E6F8F1; border-radius: 8px; margin-bottom: 24px;">
                    <tr>
                      <td style="padding: 20px; text-align: center;">
                        <span style="font-size: 24px;">✓</span>
                        <h2 style="margin: 8px 0 4px; color: #03834D; font-size: 20px;">
                          Order Confirmed
                        </h2>
                        <p style="margin: 0; color: #666; font-size: 14px;">
                          Thank you for your purchase, ${data.customerName}!
                        </p>
                      </td>
                    </tr>
                  </table>

                  <!-- Order Number -->
                  <p style="margin: 0 0 24px; font-size: 14px; color: #666;">
                    Order Number: <strong style="color: #1A1A1A;">${data.orderNumber}</strong>
                  </p>

                  <!-- Line Items -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                    <thead>
                      <tr>
                        <th style="text-align: left; padding-bottom: 12px; border-bottom: 2px solid #1A1A1A; font-size: 12px; text-transform: uppercase; color: #666;">
                          Item
                        </th>
                        <th style="text-align: center; padding-bottom: 12px; border-bottom: 2px solid #1A1A1A; font-size: 12px; text-transform: uppercase; color: #666;">
                          Qty
                        </th>
                        <th style="text-align: right; padding-bottom: 12px; border-bottom: 2px solid #1A1A1A; font-size: 12px; text-transform: uppercase; color: #666;">
                          Price
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      ${lineItemsHtml}
                    </tbody>
                  </table>

                  <!-- Totals -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                    <tr>
                      <td style="padding: 8px 0; color: #666;">Subtotal</td>
                      <td style="padding: 8px 0; text-align: right;">${formatPrice(data.subtotal, data.currency)}</td>
                    </tr>
                    ${
                      data.discountTotal > 0
                        ? `
                    <tr>
                      <td style="padding: 8px 0; color: #04BB6E;">Discount</td>
                      <td style="padding: 8px 0; text-align: right; color: #04BB6E;">-${formatPrice(data.discountTotal, data.currency)}</td>
                    </tr>
                    `
                        : ""
                    }
                    <tr>
                      <td style="padding: 8px 0; color: #666;">Shipping</td>
                      <td style="padding: 8px 0; text-align: right;">
                        ${data.shippingTotal === 0 ? "Free" : formatPrice(data.shippingTotal, data.currency)}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666;">Tax</td>
                      <td style="padding: 8px 0; text-align: right;">${formatPrice(data.taxTotal, data.currency)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; font-size: 18px; font-weight: bold; border-top: 2px solid #1A1A1A;">
                        Total
                      </td>
                      <td style="padding: 12px 0; font-size: 18px; font-weight: bold; text-align: right; border-top: 2px solid #1A1A1A;">
                        ${formatPrice(data.grandTotal, data.currency)}
                      </td>
                    </tr>
                  </table>

                  <!-- Shipping Address -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background: #F9F9F9; border-radius: 8px;">
                    <tr>
                      <td style="padding: 16px;">
                        <p style="margin: 0 0 8px; font-size: 12px; text-transform: uppercase; color: #666; font-weight: bold;">
                          Shipping Address
                        </p>
                        <p style="margin: 0; color: #1A1A1A; line-height: 1.6;">
                          ${addressLine}
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Footer -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 32px;">
              <tr>
                <td style="text-align: center; color: #666; font-size: 14px;">
                  <p style="margin: 0 0 8px;">
                    Questions? Reply to this email or contact us at
                    <a href="mailto:hello@keesdeen.com" style="color: #04BB6E;">hello@keesdeen.com</a>
                  </p>
                  <p style="margin: 0; font-size: 12px; color: #999;">
                    © ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  if (!resend) {
    console.warn("RESEND_API_KEY not set, skipping order confirmation email");
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.customerEmail,
      subject: `Order Confirmed - ${data.orderNumber}`,
      html,
    });

    if (error) {
      console.error("Failed to send order confirmation email:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending order confirmation email:", error);
    return false;
  }
}

/**
 * Send shipping confirmation email.
 */
export async function sendShippingConfirmationEmail(data: {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
}): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #F9F9F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <tr>
          <td>
            <table width="100%" cellpadding="0" cellspacing="0" style="background: #FFFFFF; border-radius: 12px; padding: 32px;">
              <tr>
                <td style="text-align: center;">
                  <h1 style="font-family: Georgia, serif; font-size: 24px; color: #1A1A1A; margin: 0 0 16px;">
                    ${COMPANY_NAME}
                  </h1>
                  <span style="font-size: 48px;">📦</span>
                  <h2 style="margin: 16px 0 8px; color: #1A1A1A;">Your order is on its way!</h2>
                  <p style="margin: 0 0 24px; color: #666;">
                    Hi ${data.customerName}, your order ${data.orderNumber} has shipped.
                  </p>
                  ${
                    data.trackingUrl
                      ? `
                    <a href="${data.trackingUrl}" style="display: inline-block; background: #04BB6E; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                      Track Your Order
                    </a>
                  `
                      : ""
                  }
                  ${
                    data.trackingNumber && !data.trackingUrl
                      ? `
                    <p style="margin: 16px 0 0; color: #666;">
                      Tracking Number: <strong>${data.trackingNumber}</strong>
                      ${data.carrier ? `<br>Carrier: ${data.carrier}` : ""}
                    </p>
                  `
                      : ""
                  }
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  if (!resend) {
    console.warn(
      "RESEND_API_KEY not set, skipping shipping confirmation email",
    );
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.customerEmail,
      subject: `Your order is on its way! - ${data.orderNumber}`,
      html,
    });

    if (error) {
      console.error("Failed to send shipping confirmation email:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending shipping confirmation email:", error);
    return false;
  }
}

interface RefundConfirmationData {
  refundNumber: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  lines: {
    title: string;
    quantity: number;
    amount: number;
  }[];
  subtotal: number;
  taxRefund: number;
  shippingRefund: number;
  totalAmount: number;
  reason: string;
  currency: string;
}

/**
 * Send refund confirmation email.
 */
export async function sendRefundConfirmationEmail(
  data: RefundConfirmationData,
): Promise<boolean> {
  if (!resend) {
    console.warn("RESEND_API_KEY not set, skipping refund confirmation email");
    return false;
  }

  const lineItemsHtml = data.lines
    .map(
      (line) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #E0E0E0;">
          ${line.title}
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #E0E0E0; text-align: center;">
          ${line.quantity}
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #E0E0E0; text-align: right;">
          ${formatPrice(line.amount, data.currency)}
        </td>
      </tr>
    `,
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #F9F9F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <tr>
          <td>
            <!-- Header -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
              <tr>
                <td style="text-align: center;">
                  <h1 style="font-family: Georgia, serif; font-size: 28px; color: #1A1A1A; margin: 0;">
                    ${COMPANY_NAME}
                  </h1>
                </td>
              </tr>
            </table>

            <!-- Main Card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
              <tr>
                <td style="padding: 32px;">
                  <!-- Refund Banner -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background: #FEF3C7; border-radius: 8px; margin-bottom: 24px;">
                    <tr>
                      <td style="padding: 20px; text-align: center;">
                        <span style="font-size: 24px;">💰</span>
                        <h2 style="margin: 8px 0 4px; color: #92400E; font-size: 20px;">
                          Refund Processed
                        </h2>
                        <p style="margin: 0; color: #666; font-size: 14px;">
                          Your refund has been processed, ${data.customerName}
                        </p>
                      </td>
                    </tr>
                  </table>

                  <!-- Reference Numbers -->
                  <p style="margin: 0 0 8px; font-size: 14px; color: #666;">
                    Refund Number: <strong style="color: #1A1A1A;">${data.refundNumber}</strong>
                  </p>
                  <p style="margin: 0 0 24px; font-size: 14px; color: #666;">
                    Order Number: <strong style="color: #1A1A1A;">${data.orderNumber}</strong>
                  </p>

                  <!-- Refund Reason -->
                  <p style="margin: 0 0 24px; padding: 12px; background: #F9F9F9; border-radius: 8px; font-size: 14px; color: #666;">
                    <strong>Reason:</strong> ${data.reason}
                  </p>

                  <!-- Refunded Items -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                    <thead>
                      <tr>
                        <th style="text-align: left; padding-bottom: 12px; border-bottom: 2px solid #1A1A1A; font-size: 12px; text-transform: uppercase; color: #666;">
                          Item
                        </th>
                        <th style="text-align: center; padding-bottom: 12px; border-bottom: 2px solid #1A1A1A; font-size: 12px; text-transform: uppercase; color: #666;">
                          Qty
                        </th>
                        <th style="text-align: right; padding-bottom: 12px; border-bottom: 2px solid #1A1A1A; font-size: 12px; text-transform: uppercase; color: #666;">
                          Refund
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      ${lineItemsHtml}
                    </tbody>
                  </table>

                  <!-- Totals -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                    <tr>
                      <td style="padding: 8px 0; color: #666;">Items Refund</td>
                      <td style="padding: 8px 0; text-align: right;">${formatPrice(data.subtotal, data.currency)}</td>
                    </tr>
                    ${
                      data.taxRefund > 0
                        ? `
                    <tr>
                      <td style="padding: 8px 0; color: #666;">Tax Refund</td>
                      <td style="padding: 8px 0; text-align: right;">${formatPrice(data.taxRefund, data.currency)}</td>
                    </tr>
                    `
                        : ""
                    }
                    ${
                      data.shippingRefund > 0
                        ? `
                    <tr>
                      <td style="padding: 8px 0; color: #666;">Shipping Refund</td>
                      <td style="padding: 8px 0; text-align: right;">${formatPrice(data.shippingRefund, data.currency)}</td>
                    </tr>
                    `
                        : ""
                    }
                    <tr>
                      <td style="padding: 12px 0; font-size: 18px; font-weight: bold; border-top: 2px solid #1A1A1A;">
                        Total Refund
                      </td>
                      <td style="padding: 12px 0; font-size: 18px; font-weight: bold; text-align: right; border-top: 2px solid #1A1A1A; color: #04BB6E;">
                        ${formatPrice(data.totalAmount, data.currency)}
                      </td>
                    </tr>
                  </table>

                  <!-- Processing Note -->
                  <p style="margin: 0; padding: 12px; background: #E6F8F1; border-radius: 8px; font-size: 14px; color: #03834D;">
                    Your refund will be credited to your original payment method within 5-10 business days.
                  </p>
                </td>
              </tr>
            </table>

            <!-- Footer -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 32px;">
              <tr>
                <td style="text-align: center; color: #666; font-size: 14px;">
                  <p style="margin: 0 0 8px;">
                    Questions? Contact us at
                    <a href="mailto:hello@keesdeen.com" style="color: #04BB6E;">hello@keesdeen.com</a>
                  </p>
                  <p style="margin: 0; font-size: 12px; color: #999;">
                    © ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.customerEmail,
      subject: `Refund Processed - ${data.refundNumber}`,
      html,
    });

    if (error) {
      console.error("Failed to send refund confirmation email:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending refund confirmation email:", error);
    return false;
  }
}

/**
 * Send password reset email.
 */
export async function sendPasswordResetEmail(data: {
  email: string;
  name: string;
  resetUrl: string;
}): Promise<boolean> {
  if (!resend) {
    console.warn("RESEND_API_KEY not set, skipping password reset email");
    console.log("Reset URL (dev):", data.resetUrl);
    return false;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background:#F9F9F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:40px 20px;">
        <tr><td>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;"><tr><td style="text-align:center;">
            <h1 style="font-family:Georgia,serif;font-size:28px;color:#1A1A1A;margin:0;">${COMPANY_NAME}</h1>
          </td></tr></table>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;overflow:hidden;">
            <tr><td style="padding:32px;">
              <h2 style="margin:0 0 16px;color:#1A1A1A;font-size:20px;">Reset your password</h2>
              <p style="margin:0 0 24px;color:#666;font-size:14px;line-height:1.6;">
                Hi ${data.name}, we received a request to reset your password. Click the button below to choose a new one. This link will expire in 1 hour.
              </p>
              <a href="${data.resetUrl}" style="display:inline-block;background:#04BB6E;color:white;text-decoration:none;padding:14px 32px;font-weight:700;font-size:14px;">
                Reset Password
              </a>
              <p style="margin:24px 0 0;color:#999;font-size:12px;line-height:1.6;">
                If the button doesn't work, copy and paste this link:<br>
                <a href="${data.resetUrl}" style="color:#04BB6E;word-break:break-all;">${data.resetUrl}</a>
              </p>
              <p style="margin:24px 0 0;color:#999;font-size:12px;">
                If you didn't request this, you can safely ignore this email.
              </p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;"><tr><td style="text-align:center;font-size:12px;color:#999;">
            © ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.
          </td></tr></table>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: "Reset your password — Keesdeen",
      html,
    });
    if (error) {
      console.error("Failed to send reset email:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error sending reset email:", error);
    return false;
  }
}
