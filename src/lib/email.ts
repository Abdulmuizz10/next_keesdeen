import "server-only";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.FROM_EMAIL || "hello@keesdeen.com";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "hello@keesdeen.com";
const ADMIN_NOTIFY_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || SUPPORT_EMAIL;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://keesdeen.com";
const COMPANY_NAME = "Keesdeen";

const CONTACT_REPLY_SLA: string = "within 1–3 business days";

// ----------------------------------------------------------------------------
// Design tokens — pulled directly from the site's Tailwind theme
// ----------------------------------------------------------------------------
const THEME = {
  font: {
    serif: `'Cormorant Garamond', 'EB Garamond', Georgia, serif`,
    sans: `'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
  },
  color: {
    primary50: "#E6F8F1",
    primary100: "#98E3C4",
    primary300: "#2FC787",
    primary400: "#04BB6E",
    primary500: "#03834D",
    primary600: "#027243",
    secondary400: "#DA5B14",
    neutral50: "#F9F9F9",
    neutral100: "#F0F0F0",
    neutral200: "#E0E0E0",
    neutral300: "#ABABAB",
    neutral400: "#3C3C3C",
    neutral500: "#2A2A2A",
    neutral600: "#1A1A1A",
    white: "#FFFFFF",
    danger: "#B3261E",
  },
} as const;

/* ============================================================================
   SHARED PRIMITIVES

   Kept deliberately small. Every email type is free to compose these
   differently — an order email, a security email, and a promotion should not
   share one rigid "card" shape. See the audit brief, section 18.
============================================================================ */

/** Format an integer cents amount as a localized currency string. */
export function formatPrice(cents: number, currency: string = "GBP"): string {
  const locale = currency === "GBP" ? "en-GB" : "en-US";
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(
    cents / 100,
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Escapes a URL before it's interpolated into an href/src attribute. URLs
 * that ultimately end up in an <a> or <img> tag should always go through
 * this — including internally-generated ones — so a stray quote or angle
 * bracket in a token/query string can't break out of the attribute.
 */
function escapeAttr(url: string): string {
  return escapeHtml(url);
}

/**
 * Small uppercase metadata tag. Reserved for a handful of places where a
 * label genuinely helps scanning (a tracking number, a shipping address) —
 * not applied to every section header. Overusing this is one of the more
 * obvious "AI email template" tells.
 */
function label(text: string, color: string = THEME.color.neutral300): string {
  return `<p style="margin:0 0 6px;font-family:${THEME.font.sans};font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:${color};">${text}</p>`;
}

/** A plain hairline rule. The primary tool for separating sections — used instead of boxes. */
function rule(color: string = THEME.color.neutral100): string {
  return `<tr><td style="border-top:1px solid ${color};font-size:0;line-height:0;">&nbsp;</td></tr>`;
}

/**
 * Sharp-cornered CTA. Sentence case rather than all-caps — all-caps, wide
 * letter-spaced buttons are one of the most generic "SaaS transactional
 * email" signals there is, and this system otherwise leans on a serif/sans
 * contrast for character instead of on decoration.
 */
function ctaButton(
  copy: string,
  url: string,
  bg: string = THEME.color.neutral600,
  fg: string = THEME.color.white,
): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="background:${bg};">
        <a href="${escapeAttr(url)}" style="display:inline-block;padding:14px 30px;font-family:${THEME.font.sans};font-size:14px;font-weight:600;color:${fg};text-decoration:none;">
          ${copy}
        </a>
      </td>
    </tr>
  </table>`;
}

/** Thin key/value row used in order, refund, and account summaries. */
function summaryRow(
  label: string,
  value: string,
  opts?: { strong?: boolean; color?: string },
): string {
  const color = opts?.color || THEME.color.neutral600;
  return `
  <tr>
    <td style="padding:${opts?.strong ? "12px 0 0" : "5px 0"};font-family:${THEME.font.sans};font-size:${opts?.strong ? "15px" : "14px"};font-weight:${opts?.strong ? 600 : 400};color:${THEME.color.neutral400};${opts?.strong ? `border-top:1px solid ${THEME.color.neutral600};` : ""}">
      ${label}
    </td>
    <td align="right" style="padding:${opts?.strong ? "12px 0 0" : "5px 0"};font-family:${THEME.font.sans};font-size:${opts?.strong ? "15px" : "14px"};font-weight:${opts?.strong ? 600 : 500};color:${color};${opts?.strong ? `border-top:1px solid ${THEME.color.neutral600};` : ""}">
      ${value}
    </td>
  </tr>`;
}

type ShellVariant = "customer" | "promotional" | "internal";

/**
 * The shared shell. Deliberately thin: a quiet letterhead, the content slot,
 * a quiet footer. No colored status rail, no perforated "tag stub" divider —
 * both read as invented design-system decoration rather than anything
 * Keesdeen's brand actually does elsewhere (see audit brief, sections 4.1
 * and 4.3). If an SVG/PNG wordmark asset exists, swap it in at the header
 * comment below — it will read as more "real" than any text treatment.
 */
function renderShell(opts: {
  preheader: string;
  bodyHtml: string;
  variant?: ShellVariant;
  footerHtml?: string;
}): string {
  const variant = opts.variant ?? "customer";

  const header =
    variant === "internal"
      ? "" // internal/admin emails skip the letterhead entirely — see brief section 17
      : `
          <tr>
            <td style="padding:36px 40px 28px;">
              <!-- Wordmark: swap for a real logo asset (SVG/PNG) if one exists for email use -->
              <p style="margin:0;font-family:${THEME.font.sans};font-size:13px;font-weight:700;letter-spacing:0.14em;color:${THEME.color.neutral600};">
                ${COMPANY_NAME.toUpperCase()}
              </p>
            </td>
          </tr>
          <tr><td style="border-top:1px solid ${THEME.color.neutral100};"></td></tr>`;

  const footer =
    opts.footerHtml ??
    `
          <tr>
            <td style="padding:28px 40px 36px;">
              <p style="margin:0 0 4px;font-family:${THEME.font.sans};font-size:12px;color:${THEME.color.neutral300};">
                Questions about this order? Email
                <a href="mailto:${SUPPORT_EMAIL}" style="color:${THEME.color.neutral400};text-decoration:underline;">${SUPPORT_EMAIL}</a>
              </p>
              <p style="margin:0;font-family:${THEME.font.sans};font-size:12px;color:${THEME.color.neutral300};">
                ${COMPANY_NAME} · © ${new Date().getFullYear()}
              </p>
            </td>
          </tr>`;

  const containerBg =
    variant === "internal" ? THEME.color.white : THEME.color.neutral50;
  const contentPadding = variant === "internal" ? "32px 32px" : "8px 40px 40px";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light">
<title>${COMPANY_NAME}</title>
</head>
<body style="margin:0;padding:0;background:${containerBg};font-family:${THEME.font.sans};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preheader)}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${containerBg};">
    <tr>
      <td align="center" style="padding:${variant === "internal" ? "24px 16px" : "40px 16px"};">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:${THEME.color.white};${variant === "internal" ? `border:1px solid ${THEME.color.neutral100};` : ""}">
          ${header}
          <tr>
            <td style="padding:${contentPadding};">
              ${opts.bodyHtml}
            </td>
          </tr>
          ${variant === "internal" ? "" : `<tr><td style="border-top:1px solid ${THEME.color.neutral100};"></td></tr>${footer}`}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Central send wrapper: no-ops safely when Resend isn't configured, logs failures consistently. */
async function dispatch(params: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  context: string;
}): Promise<boolean> {
  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY not set — skipping "${params.context}"`,
    );
    return false;
  }
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html: params.html,
      replyTo: params.replyTo,
    });
    if (error) {
      console.error(`[email] Failed to send "${params.context}":`, error);
      return false;
    }
    // Keep the Resend message id in logs (not exposed to the customer) so a
    // support ticket ("I never got my confirmation") can be traced to a send.
    console.log(`[email] sent "${params.context}" to ${params.to}`, data?.id);
    return true;
  } catch (err) {
    console.error(`[email] Error sending "${params.context}":`, err);
    return false;
  }
}

/* ============================================================================
   1. AUTH — welcome, password reset, password-changed confirmation
============================================================================ */

export async function sendWelcomeEmail(data: {
  name: string;
  email: string;
}): Promise<boolean> {
  const firstName = escapeHtml(data.name.split(" ")[0] || data.name);
  const body = `
    <h2 style="margin:0 0 14px;font-family:${THEME.font.serif};font-weight:500;font-size:26px;color:${THEME.color.neutral600};">
      Welcome to Keesdeen, ${firstName}.
    </h2>
    <p style="margin:0 0 26px;font-family:${THEME.font.sans};font-size:15px;line-height:1.7;color:${THEME.color.neutral400};">
      Your account is set up. You can come back to it any time to check an order or update your details.
    </p>
    ${ctaButton("Start shopping", `${SITE_URL}/products`)}
    <p style="margin:30px 0 0;font-family:${THEME.font.sans};font-size:12px;color:${THEME.color.neutral300};">
      Didn't create this account? <a href="mailto:${SUPPORT_EMAIL}" style="color:${THEME.color.neutral400};">Let us know</a> and we'll sort it out.
    </p>`;

  return dispatch({
    to: data.email,
    subject: `Welcome to ${COMPANY_NAME}`,
    html: renderShell({ preheader: "Your account is ready.", bodyHtml: body }),
    context: "welcome email",
  });
}

export async function sendPasswordResetEmail(data: {
  email: string;
  name: string;
  resetUrl: string;
}): Promise<boolean> {
  const body = `
    <h2 style="margin:0 0 14px;font-family:${THEME.font.serif};font-weight:500;font-size:26px;color:${THEME.color.neutral600};">
      Reset your password
    </h2>
    <p style="margin:0 0 26px;font-family:${THEME.font.sans};font-size:15px;line-height:1.7;color:${THEME.color.neutral400};">
      We received a request to reset the password on your ${escapeHtml(data.email)} account. This link
      is valid for <strong style="color:${THEME.color.neutral600};">1 hour</strong>. If you didn't request
      this, you don't need to do anything — your password hasn't changed.
    </p>
    ${ctaButton("Reset password", data.resetUrl)}
    <p style="margin:26px 0 0;font-family:${THEME.font.sans};font-size:12px;line-height:1.6;color:${THEME.color.neutral300};">
      If the button doesn't work, paste this link into your browser:<br>
      <a href="${escapeAttr(data.resetUrl)}" style="color:${THEME.color.neutral400};word-break:break-all;">${escapeHtml(data.resetUrl)}</a>
    </p>`;

  return dispatch({
    to: data.email,
    subject: `Reset your password — ${COMPANY_NAME}`,
    html: renderShell({
      preheader: "This link expires in 1 hour.",
      bodyHtml: body,
    }),
    context: "password reset email",
  });
}

/** Confirms a password was changed, so the customer notices unauthorized resets. */
export async function sendPasswordChangedEmail(data: {
  email: string;
  name: string;
}): Promise<boolean> {
  const body = `
    <h2 style="margin:0 0 14px;font-family:${THEME.font.serif};font-weight:500;font-size:26px;color:${THEME.color.neutral600};">
      Your password was changed
    </h2>
    <p style="margin:0 0 22px;font-family:${THEME.font.sans};font-size:15px;line-height:1.7;color:${THEME.color.neutral400};">
      This confirms the password on your ${escapeHtml(data.email)} account was just updated.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:14px 0;border-top:2px solid ${THEME.color.danger};border-bottom:2px solid ${THEME.color.danger};">
        <p style="margin:0;font-family:${THEME.font.sans};font-size:14px;font-weight:600;color:${THEME.color.danger};">
          Wasn't you? <a href="mailto:${SUPPORT_EMAIL}" style="color:${THEME.color.danger};">Contact us immediately.</a>
        </p>
      </td></tr>
    </table>`;

  return dispatch({
    to: data.email,
    subject: `Your password was changed — ${COMPANY_NAME}`,
    html: renderShell({
      preheader: "Confirming a recent password change.",
      bodyHtml: body,
    }),
    context: "password changed email",
  });
}

/* ============================================================================
   2. ORDERS — confirmation, shipped, delivered
============================================================================ */

interface OrderLine {
  title: string;
  variantTitle: string;
  quantity: number;
  price: number;
  imageUrl?: string;
}

interface OrderAddress {
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

function renderOrderLinesTable(lines: OrderLine[], currency: string): string {
  const rows = lines
    .map((line) => {
      const thumb = line.imageUrl
        ? `<td width="56" style="padding:16px 14px 16px 0;border-bottom:1px solid ${THEME.color.neutral100};vertical-align:top;">
             <img src="${escapeAttr(line.imageUrl)}" width="56" height="56" alt="${escapeHtml(line.title)}" style="display:block;width:56px;height:56px;object-fit:cover;">
           </td>`
        : "";
      return `
      <tr>
        ${thumb}
        <td style="padding:16px 0;border-bottom:1px solid ${THEME.color.neutral100};font-family:${THEME.font.sans};">
          <span style="display:block;font-size:14px;font-weight:600;color:${THEME.color.neutral600};">${escapeHtml(line.title)}</span>
          <span style="display:block;font-size:13px;color:${THEME.color.neutral300};margin-top:2px;">${escapeHtml(line.variantTitle)} · Qty ${line.quantity}</span>
        </td>
        <td align="right" style="padding:16px 0;border-bottom:1px solid ${THEME.color.neutral100};font-family:${THEME.font.sans};font-size:14px;font-weight:600;color:${THEME.color.neutral600};white-space:nowrap;vertical-align:top;">
          ${formatPrice(line.price * line.quantity, currency)}
        </td>
      </tr>`;
    })
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;
}

function renderShippingAddress(address: OrderAddress): string {
  const lines = [
    `${address.firstName} ${address.lastName}`,
    address.address1,
    address.address2,
    `${address.city}, ${address.state} ${address.postalCode}`,
    address.country,
  ]
    .filter(Boolean)
    .map((l) => escapeHtml(l as string))
    .join("<br>");

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
    <tr><td style="padding-top:20px;border-top:1px solid ${THEME.color.neutral100};">
      ${label("Shipping to")}
      <p style="margin:0;font-family:${THEME.font.sans};font-size:14px;line-height:1.7;color:${THEME.color.neutral600};">${lines}</p>
    </td></tr>
  </table>`;
}

export async function sendOrderConfirmationEmail(data: {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  lines: OrderLine[];
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  grandTotal: number;
  shippingAddress: OrderAddress;
  currency: string;
}): Promise<boolean> {
  const firstName = escapeHtml(
    data.customerName.split(" ")[0] || data.customerName,
  );
  const body = `
    <h2 style="margin:0 0 6px;font-family:${THEME.font.serif};font-weight:500;font-size:26px;color:${THEME.color.neutral600};">
      Thanks, ${firstName}. Your order is confirmed.
    </h2>
    <p style="margin:0 0 28px;font-family:${THEME.font.sans};font-size:13px;color:${THEME.color.neutral300};">
      Order ${escapeHtml(data.orderNumber)}
    </p>

    ${renderOrderLinesTable(data.lines, data.currency)}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;">
      ${summaryRow("Subtotal", formatPrice(data.subtotal, data.currency))}
      ${data.discountTotal > 0 ? summaryRow("Discount", `−${formatPrice(data.discountTotal, data.currency)}`, { color: THEME.color.primary500 }) : ""}
      ${summaryRow("Shipping", data.shippingTotal === 0 ? "Free" : formatPrice(data.shippingTotal, data.currency))}
      ${summaryRow("Tax", formatPrice(data.taxTotal, data.currency))}
      ${summaryRow("Total", formatPrice(data.grandTotal, data.currency), { strong: true })}
    </table>

    ${renderShippingAddress(data.shippingAddress)}

    <div style="margin-top:30px;">
      ${ctaButton("View order", `${SITE_URL}/account/orders`)}
    </div>`;

  return dispatch({
    to: data.customerEmail,
    subject: `Order confirmed — ${data.orderNumber}`,
    html: renderShell({
      preheader: `Order ${data.orderNumber} is confirmed.`,
      bodyHtml: body,
    }),
    context: "order confirmation email",
  });
}

export async function sendShippingConfirmationEmail(data: {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
}): Promise<boolean> {
  const firstName = escapeHtml(
    data.customerName.split(" ")[0] || data.customerName,
  );
  const body = `
    <h2 style="margin:0 0 6px;font-family:${THEME.font.serif};font-weight:500;font-size:26px;color:${THEME.color.neutral600};">
      Your order has shipped
    </h2>
    <p style="margin:0 0 26px;font-family:${THEME.font.sans};font-size:13px;color:${THEME.color.neutral300};">
      Order ${escapeHtml(data.orderNumber)}${data.carrier ? ` · ${escapeHtml(data.carrier)}` : ""}
    </p>
    <p style="margin:0 0 26px;font-family:${THEME.font.sans};font-size:15px;line-height:1.7;color:${THEME.color.neutral400};">
      Hi ${firstName}, it's on its way.
    </p>
    ${
      data.trackingNumber
        ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:26px;">
            <tr><td style="padding:18px 0;border-top:1px solid ${THEME.color.neutral100};border-bottom:1px solid ${THEME.color.neutral100};">
              ${label("Tracking number")}
              <p style="margin:0;font-family:${THEME.font.sans};font-size:17px;font-weight:600;letter-spacing:0.03em;color:${THEME.color.neutral600};">${escapeHtml(data.trackingNumber)}</p>
            </td></tr>
          </table>`
        : ""
    }
    ${data.trackingUrl ? ctaButton("Track package", data.trackingUrl, THEME.color.secondary400) : ""}`;

  return dispatch({
    to: data.customerEmail,
    subject: `Your order has shipped — ${data.orderNumber}`,
    html: renderShell({
      preheader: "Your order is on its way.",
      bodyHtml: body,
    }),
    context: "shipping confirmation email",
  });
}

export async function sendDeliveredEmail(data: {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
}): Promise<boolean> {
  const firstName = escapeHtml(
    data.customerName.split(" ")[0] || data.customerName,
  );
  const body = `
    <h2 style="margin:0 0 6px;font-family:${THEME.font.serif};font-weight:500;font-size:26px;color:${THEME.color.neutral600};">
      Your order has arrived
    </h2>
    <p style="margin:0 0 26px;font-family:${THEME.font.sans};font-size:13px;color:${THEME.color.neutral300};">
      Order ${escapeHtml(data.orderNumber)}
    </p>
    <p style="margin:0 0 28px;font-family:${THEME.font.sans};font-size:15px;line-height:1.7;color:${THEME.color.neutral400};">
      Hi ${firstName}, this order was marked delivered. We hope you enjoy it — if anything isn't right, just reply to this email.
    </p>
    ${ctaButton("View order", `${SITE_URL}/account/orders`)}`;

  return dispatch({
    to: data.customerEmail,
    subject: `Delivered — ${data.orderNumber}`,
    html: renderShell({ preheader: "Your order has arrived.", bodyHtml: body }),
    context: "delivery confirmation email",
  });
}

/* ============================================================================
   3. REFUNDS
============================================================================ */

interface RefundLine {
  title: string;
  quantity: number;
  amount: number;
}

export async function sendRefundConfirmationEmail(data: {
  refundNumber: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  lines: RefundLine[];
  subtotal: number;
  taxRefund: number;
  shippingRefund: number;
  totalAmount: number;
  reason: string;
  currency: string;
}): Promise<boolean> {
  const rows = data.lines
    .map(
      (line) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid ${THEME.color.neutral100};font-family:${THEME.font.sans};font-size:14px;color:${THEME.color.neutral600};">
          ${escapeHtml(line.title)} <span style="color:${THEME.color.neutral300};">× ${line.quantity}</span>
        </td>
        <td align="right" style="padding:12px 0;border-bottom:1px solid ${THEME.color.neutral100};font-family:${THEME.font.sans};font-size:14px;font-weight:600;color:${THEME.color.neutral600};">
          ${formatPrice(line.amount, data.currency)}
        </td>
      </tr>`,
    )
    .join("");

  const body = `
    <h2 style="margin:0 0 6px;font-family:${THEME.font.serif};font-weight:500;font-size:26px;color:${THEME.color.neutral600};">
      Your refund has been processed
    </h2>
    <p style="margin:0 0 28px;font-family:${THEME.font.sans};font-size:13px;color:${THEME.color.neutral300};">
      Refund ${escapeHtml(data.refundNumber)} · Order ${escapeHtml(data.orderNumber)}
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;">
      ${summaryRow("Items", formatPrice(data.subtotal, data.currency))}
      ${data.taxRefund > 0 ? summaryRow("Tax", formatPrice(data.taxRefund, data.currency)) : ""}
      ${data.shippingRefund > 0 ? summaryRow("Shipping", formatPrice(data.shippingRefund, data.currency)) : ""}
      ${summaryRow("Total refund", formatPrice(data.totalAmount, data.currency), { strong: true, color: THEME.color.primary500 })}
    </table>

    <p style="margin:22px 0 0;font-family:${THEME.font.sans};font-size:13px;line-height:1.7;color:${THEME.color.neutral300};">
      ${escapeHtml(data.reason)}
    </p>

    <p style="margin:24px 0 0;font-family:${THEME.font.sans};font-size:13px;line-height:1.7;color:${THEME.color.neutral400};">
      This will be returned to your original payment method. Depending on your bank, it can take a few
      business days to appear.
    </p>`;

  return dispatch({
    to: data.customerEmail,
    subject: `Refund processed — ${data.refundNumber}`,
    html: renderShell({
      preheader: `${formatPrice(data.totalAmount, data.currency)} refund confirmed.`,
      bodyHtml: body,
    }),
    context: "refund confirmation email",
  });
}

/* ============================================================================
   4. NEWSLETTER SUBSCRIBERS
============================================================================ */

export async function sendSubscriberWelcomeEmail(data: {
  email: string;
  firstName?: string;
}): Promise<boolean> {
  const greetingName = data.firstName ? escapeHtml(data.firstName) : "there";
  const body = `
    <h2 style="margin:0 0 14px;font-family:${THEME.font.serif};font-weight:500;font-size:26px;color:${THEME.color.neutral600};">
      You're subscribed, ${greetingName}
    </h2>
    <p style="margin:0 0 26px;font-family:${THEME.font.sans};font-size:15px;line-height:1.7;color:${THEME.color.neutral400};">
      You'll hear from us when there's a new drop, a restock, or an offer worth your time.
    </p>
    ${ctaButton("Shop new arrivals", `${SITE_URL}/shop?sort=newest`)}`;

  return dispatch({
    to: data.email,
    subject: `You're on the list — ${COMPANY_NAME}`,
    html: renderShell({
      preheader: "Welcome to the newsletter.",
      bodyHtml: body,
      footerHtml: `
          <tr>
            <td style="padding:28px 40px 36px;">
              <p style="margin:0;font-family:${THEME.font.sans};font-size:12px;color:${THEME.color.neutral300};">
                ${COMPANY_NAME} · © ${new Date().getFullYear()}
              </p>
            </td>
          </tr>`,
    }),
    context: "subscriber welcome email",
  });
}

/* ============================================================================
   5. PROMOTIONS — one-off broadcast to active subscribers

   Promotions are the one email type allowed real visual range (brief,
   section 15) — but they should look like an editorial mailing from a
   fashion brand, not the transactional shell with a banner dropped in.
============================================================================ */

export interface PromotionEmailContent {
  headline: string;
  bodyText: string;
  ctaLabel: string;
  ctaUrl: string;
  bannerImageUrl?: string;
  discountCode?: string;
}

function renderPromotionEmail(
  content: PromotionEmailContent,
  unsubscribeUrl: string,
): string {
  const banner = content.bannerImageUrl
    ? `<tr><td style="padding:0 40px;">
         <img src="${escapeAttr(content.bannerImageUrl)}" alt="" width="520" style="display:block;width:100%;max-width:520px;height:auto;margin-top:32px;">
       </td></tr>`
    : "";

  const code = content.discountCode
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 4px;">
        <tr><td style="border:1px solid ${THEME.color.neutral600};padding:14px 24px;">
          ${label("Code", THEME.color.neutral300)}
          <span style="font-family:${THEME.font.sans};font-size:17px;font-weight:700;letter-spacing:0.04em;color:${THEME.color.neutral600};">${escapeHtml(content.discountCode)}</span>
        </td></tr>
      </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light">
<title>${COMPANY_NAME}</title>
</head>
<body style="margin:0;padding:0;background:${THEME.color.neutral50};font-family:${THEME.font.sans};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(content.bodyText.slice(0, 100))}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${THEME.color.neutral50};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:${THEME.color.white};">

          <tr>
            <td style="padding:36px 40px 28px;">
              <p style="margin:0;font-family:${THEME.font.sans};font-size:13px;font-weight:700;letter-spacing:0.14em;color:${THEME.color.neutral600};">
                ${COMPANY_NAME.toUpperCase()}
              </p>
            </td>
          </tr>
          ${rule()}
          ${banner}

          <tr>
            <td style="padding:36px 40px 40px;">
              <h1 style="margin:0 0 18px;font-family:${THEME.font.serif};font-weight:500;font-size:34px;line-height:1.2;color:${THEME.color.neutral600};">
                ${escapeHtml(content.headline)}
              </h1>
              <p style="margin:0;max-width:440px;font-family:${THEME.font.sans};font-size:15px;line-height:1.7;color:${THEME.color.neutral400};">
                ${escapeHtml(content.bodyText)}
              </p>
              ${code}
              <div style="margin-top:28px;">
                ${ctaButton(content.ctaLabel, content.ctaUrl, THEME.color.primary500)}
              </div>
            </td>
          </tr>

          ${rule()}
          <tr>
            <td style="padding:24px 40px 32px;">
              <p style="margin:0;font-family:${THEME.font.sans};font-size:11px;line-height:1.6;color:${THEME.color.neutral300};">
                You're receiving this because you subscribed to ${COMPANY_NAME} updates.
                <a href="${escapeAttr(unsubscribeUrl)}" style="color:${THEME.color.neutral300};text-decoration:underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Send a single promotion email — used for one-off/test sends. */
export async function sendPromotionEmail(data: {
  to: string;
  unsubscribeUrl: string;
  content: PromotionEmailContent;
}): Promise<boolean> {
  return dispatch({
    to: data.to,
    subject: data.content.headline,
    html: renderPromotionEmail(data.content, data.unsubscribeUrl),
    context: "promotion email",
  });
}

/**
 * Broadcast a promotion to many subscribers at once using Resend's batch API
 * (up to 100 per batch call). Pass unsubscribeUrlFor to generate a per-recipient
 * unsubscribe link (e.g. signed token per subscriber id).
 */
export async function sendPromotionBroadcast(data: {
  recipients: { email: string; subscriberId: string }[];
  content: PromotionEmailContent;
  unsubscribeUrlFor: (subscriberId: string) => string;
}): Promise<{ sent: number; failed: number; skipped: number }> {
  if (!resend) {
    console.warn(
      "[email] RESEND_API_KEY not set — skipping promotion broadcast",
    );
    return { sent: 0, failed: data.recipients.length, skipped: 0 };
  }

  // Resend rejects sends to these outright — they're reserved for docs/
  // examples and are never deliverable. Filtering them here means one
  // stray test subscriber can never again take the rest of the batch
  // down with it.
  const NON_DELIVERABLE_DOMAINS = new Set([
    "example.com",
    "example.org",
    "example.net",
    "test.com",
  ]);
  const isDeliverable = (email: string) => {
    const domain = email.split("@")[1]?.toLowerCase();
    return !!domain && !NON_DELIVERABLE_DOMAINS.has(domain);
  };

  const sendable = data.recipients.filter((r) => isDeliverable(r.email));
  const skipped = data.recipients.length - sendable.length;
  if (skipped > 0) {
    console.warn(
      `[email] Skipping ${skipped} subscriber(s) with non-deliverable test-domain emails in promotion broadcast`,
    );
  }

  const BATCH_SIZE = 100;
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < sendable.length; i += BATCH_SIZE) {
    const chunk = sendable.slice(i, i + BATCH_SIZE);
    try {
      const { error } = await resend.batch.send(
        chunk.map((r) => ({
          from: FROM_EMAIL,
          to: r.email,
          subject: data.content.headline,
          html: renderPromotionEmail(
            data.content,
            data.unsubscribeUrlFor(r.subscriberId),
          ),
        })),
      );

      if (!error) {
        sent += chunk.length;
        continue;
      }

      // The whole chunk was rejected together — fall back to sending each
      // email individually so one bad recipient doesn't cost everyone
      // else in it their delivery.
      console.error(
        "[email] Promotion batch failed, retrying chunk individually:",
        error,
      );
      const results = await Promise.allSettled(
        chunk.map((r) =>
          resend!.emails.send({
            from: FROM_EMAIL,
            to: r.email,
            subject: data.content.headline,
            html: renderPromotionEmail(
              data.content,
              data.unsubscribeUrlFor(r.subscriberId),
            ),
          }),
        ),
      );
      for (const result of results) {
        if (result.status === "fulfilled" && !result.value.error) {
          sent++;
        } else {
          failed++;
          const reason =
            result.status === "fulfilled" ? result.value.error : result.reason;
          console.error("[email] Individual promotion send failed:", reason);
        }
      }
    } catch (err) {
      console.error("[email] Promotion batch error:", err);
      failed += chunk.length;
    }
  }

  return { sent, failed, skipped };
}

/* ============================================================================
   6. CONTACT FORM — customer auto-reply + internal notification
============================================================================ */

export async function sendContactAutoReplyEmail(data: {
  name: string;
  email: string;
  subject: string;
}): Promise<boolean> {
  const firstName = escapeHtml(data.name.split(" ")[0] || data.name);
  const responseCopy = CONTACT_REPLY_SLA
    ? `Someone from our team will get back to you ${escapeHtml(CONTACT_REPLY_SLA)}.`
    : `Someone from our team will get back to you as soon as they can.`;

  const body = `
    <h2 style="margin:0 0 14px;font-family:${THEME.font.serif};font-weight:500;font-size:26px;color:${THEME.color.neutral600};">
      Thanks for reaching out, ${firstName}
    </h2>
    <p style="margin:0 0 20px;font-family:${THEME.font.sans};font-size:15px;line-height:1.7;color:${THEME.color.neutral400};">
      We've received your message about "<strong style="color:${THEME.color.neutral600};">${escapeHtml(data.subject)}</strong>".
      ${responseCopy}
    </p>
    <p style="margin:0;font-family:${THEME.font.sans};font-size:13px;color:${THEME.color.neutral300};">
      You can reply directly to this email if you think of anything else.
    </p>`;

  return dispatch({
    to: data.email,
    subject: `We've got your message — ${COMPANY_NAME}`,
    html: renderShell({ preheader: "We'll be in touch soon.", bodyHtml: body }),
    context: "contact auto-reply email",
  });
}

export async function sendContactNotificationEmail(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<boolean> {
  const body = `
    <p style="margin:0 0 4px;font-family:${THEME.font.sans};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${THEME.color.neutral300};">
      New contact form submission
    </p>
    <h2 style="margin:0 0 20px;font-family:${THEME.font.sans};font-weight:700;font-size:18px;color:${THEME.color.neutral600};">
      ${escapeHtml(data.subject)}
    </h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px;">
      ${summaryRow("From", escapeHtml(data.name))}
      ${summaryRow("Email", `<a href="mailto:${escapeAttr(data.email)}" style="color:${THEME.color.neutral600};text-decoration:none;">${escapeHtml(data.email)}</a>`)}
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:16px 0;border-top:1px solid ${THEME.color.neutral100};border-bottom:1px solid ${THEME.color.neutral100};">
        <p style="margin:0;font-family:${THEME.font.sans};font-size:14px;line-height:1.7;color:${THEME.color.neutral600};white-space:pre-wrap;">${escapeHtml(data.message)}</p>
      </td></tr>
    </table>
    <div style="margin-top:20px;">
      ${ctaButton("Reply to customer", `mailto:${data.email}`)}
    </div>`;

  return dispatch({
    to: ADMIN_NOTIFY_EMAIL,
    subject: `[Contact Form] ${data.subject}`,
    html: renderShell({
      preheader: `New message from ${data.name}`,
      bodyHtml: body,
      variant: "internal",
    }),
    replyTo: data.email,
    context: "contact notification email",
  });
}
