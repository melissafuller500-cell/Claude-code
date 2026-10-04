// Transactional email through SMTP (Hostinger). Order emails only.
import nodemailer, { type Transporter } from 'nodemailer';
import { serverEnv, escapeHtml as e } from './env';
import { whatsappUrl } from './whatsapp';
import type { Order } from './orders';
import { SITE } from '../config/site';
import { COPY } from '../content/copy';

let transporter: Transporter | null = null;
export const emailConfigured = () => {
  const s = serverEnv.smtp;
  return !!(s.host && s.user && s.pass);
};
function transport(): Transporter {
  if (!transporter) {
    const s = serverEnv.smtp;
    transporter = nodemailer.createTransport({ host: s.host, port: s.port, secure: s.port === 465, auth: { user: s.user, pass: s.pass } });
  }
  return transporter;
}

const usd = (n: number) => `$${n.toFixed(2)}`;
const statusLabel = (o: Order) => (o.status === 'paid' ? 'Paid' : 'Awaiting payment');

function orderTable(o: Order) {
  const rows = o.lines.map((l) => `<tr>
    <td style="padding:8px;border-bottom:1px solid #DFE2E6;font-family:monospace">${e(l.sku)}</td>
    <td style="padding:8px;border-bottom:1px solid #DFE2E6">${e(l.name)}${l.label ? `<br><span style="color:#4A5560;font-size:12px">${e(l.label)}</span>` : ''}<br><span style="color:#4A5560;font-size:12px">${e(l.fitmentLine)}</span></td>
    <td style="padding:8px;border-bottom:1px solid #DFE2E6;text-align:right;font-family:monospace">${l.qty}</td>
    <td style="padding:8px;border-bottom:1px solid #DFE2E6;text-align:right;font-family:monospace">${usd(l.unitPrice)}</td>
    <td style="padding:8px;border-bottom:1px solid #DFE2E6;text-align:right;font-family:monospace">${usd(l.lineTotal)}</td></tr>`).join('');
  return `<table style="border-collapse:collapse;width:100%;font-size:14px">
    <thead><tr style="background:#F4F5F7;text-align:left"><th style="padding:8px">SKU</th><th style="padding:8px">Part</th><th style="padding:8px;text-align:right">Qty</th><th style="padding:8px;text-align:right">Unit</th><th style="padding:8px;text-align:right">Total</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr><td colspan="4" style="padding:8px;text-align:right">Subtotal</td><td style="padding:8px;text-align:right;font-family:monospace">${usd(o.subtotal)}</td></tr>
      <tr><td colspan="4" style="padding:8px;text-align:right">Shipping (${o.weightLb} lb)</td><td style="padding:8px;text-align:right;font-family:monospace">${o.shipping === 0 ? 'Free' : usd(o.shipping)}</td></tr>
      <tr><td colspan="4" style="padding:8px;text-align:right;font-weight:bold">Total</td><td style="padding:8px;text-align:right;font-family:monospace;font-weight:bold">${usd(o.total)}</td></tr>
    </tfoot></table>`;
}

function address(o: Order) {
  const c = o.customer;
  return [c.name, c.business, c.address1, c.address2, `${c.city}, ${c.state} ${c.zip}`, c.phone, c.email].filter(Boolean).map(e).join('<br>');
}

function textVersion(o: Order) {
  const c = o.customer;
  return [
    `Order ${o.orderNumber} — ${statusLabel(o)}`,
    '',
    ...o.lines.map((l) => `${l.sku}  ${l.name}  x${l.qty}  @ ${usd(l.unitPrice)}  = ${usd(l.lineTotal)}`),
    '',
    `Subtotal: ${usd(o.subtotal)}`,
    `Shipping (${o.weightLb} lb): ${o.shipping === 0 ? 'Free' : usd(o.shipping)}`,
    `Total: ${usd(o.total)}`,
    '',
    'Ship to:',
    c.name, c.business, c.address1, c.address2, `${c.city}, ${c.state} ${c.zip}`, c.phone, c.email,
  ].filter((x) => x !== '').join('\n');
}

const shell = (inner: string) => `<!doctype html><html><body style="margin:0;background:#F4F5F7;font-family:Inter,Arial,sans-serif;color:#14181D">
  <div style="max-width:640px;margin:0 auto;background:#fff">
    <div style="background:#0E1114;color:#fff;padding:20px 24px;font-size:22px;font-weight:bold;letter-spacing:.02em">BAYSTOCK <span style="font-size:11px;color:#A9B2BC;letter-spacing:.2em">AUTO PARTS</span></div>
    <div style="height:4px;background:#FFC400"></div>
    <div style="padding:24px">${inner}</div>
    <div style="padding:16px 24px;background:#F4F5F7;color:#4A5560;font-size:12px">${e(SITE.legalName)} · ${e(SITE.address)} · ${e(SITE.phone)} · ${e(SITE.supportEmail)}</div>
  </div></body></html>`;

export async function sendOrderEmails(o: Order): Promise<{ customer: boolean; owner: boolean; error?: string }> {
  if (!emailConfigured()) return { customer: false, owner: false, error: 'SMTP is not configured' };
  const from = `"${SITE.name}" <${serverEnv.smtp.from}>`;
  const owner = serverEnv.orderNotifyEmail;
  const wa = o.paymentMode === 'whatsapp' ? whatsappUrl(o) : null;
  const paid = o.status === 'paid';

  const customerHtml = shell(`
    <h1 style="font-size:24px;margin:0 0 8px">Order ${e(o.orderNumber)} received</h1>
    <p style="margin:0 0 16px">Status: <strong>${statusLabel(o)}</strong></p>
    ${paid
      ? '<p>Thank you. Your payment has been received and your order will ship from our US warehouse.</p>'
      : `<p>You have not been charged. Confirm your order on WhatsApp to receive the payment details for it. Your order ships once payment is received.</p>
         ${wa ? `<p><a href="${e(wa)}" style="display:inline-block;background:#17773F;color:#fff;padding:12px 18px;border-radius:4px;text-decoration:none;font-weight:bold">Continue on WhatsApp</a></p>` : ''}
         <p style="color:#4A5560">${e(COPY.noWhatsApp)}</p>`}
    ${orderTable(o)}
    <p style="margin-top:20px"><strong>Ship to</strong><br>${address(o)}</p>
    ${o.prop65 ? `<p style="font-size:12px;color:#4A5560">California residents: ${e(COPY.prop65)}</p>` : ''}
    <p style="font-size:12px;color:#4A5560">Sales tax, where it applies, is shown on your payment request. Questions? Reply to this email.</p>`);

  const ownerHtml = shell(`
    <h1 style="font-size:22px;margin:0 0 8px">New order ${e(o.orderNumber)}</h1>
    <p>Status: <strong>${statusLabel(o)}</strong> · Payment mode: ${e(o.paymentMode)} · ${e(o.createdAt)}</p>
    ${orderTable(o)}
    <p style="margin-top:20px"><strong>Customer</strong><br>${address(o)}</p>
    ${o.paymentMode === 'whatsapp' ? '<p>Record the payment before confirming and shipping this order.</p>' : ''}`);

  const result = { customer: false, owner: false } as { customer: boolean; owner: boolean; error?: string };
  try {
    await transport().sendMail({
      from,
      to: o.customer.email,
      replyTo: owner || serverEnv.smtp.from,
      subject: `Order ${o.orderNumber} received — ${statusLabel(o)}`,
      text: `${paid ? 'Payment received.' : COPY.aboveOrderButton}\n${wa ? `Continue on WhatsApp: ${wa}\n${COPY.noWhatsApp}\n` : ''}\n${textVersion(o)}`,
      html: customerHtml,
    });
    result.customer = true;
  } catch (err) {
    result.error = `customer email failed: ${(err as Error).message}`;
  }
  if (owner) {
    try {
      await transport().sendMail({
        from, to: owner, replyTo: o.customer.email,
        subject: `New order ${o.orderNumber} — ${usd(o.total)} — ${o.customer.name}`,
        text: textVersion(o), html: ownerHtml,
      });
      result.owner = true;
    } catch (err) {
      result.error = `${result.error ? result.error + '; ' : ''}owner email failed: ${(err as Error).message}`;
    }
  }
  return result;
}

export async function sendContactEmail(msg: Record<string, string>): Promise<void> {
  const to = serverEnv.orderNotifyEmail || serverEnv.smtp.from;
  const rows = Object.entries(msg).filter(([k]) => k !== 'message').map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#4A5560">${e(k)}</td><td>${e(v)}</td></tr>`).join('');
  await transport().sendMail({
    from: `"${SITE.name} website" <${serverEnv.smtp.from}>`,
    to,
    replyTo: msg.email,
    subject: `Website message from ${msg.name}${msg.order ? ` (order ${msg.order})` : ''}`,
    text: Object.entries(msg).map(([k, v]) => `${k}: ${v}`).join('\n'),
    html: shell(`<h1 style="font-size:20px">Website message</h1><table>${rows}</table><p style="white-space:pre-wrap;margin-top:16px">${e(msg.message)}</p>`),
  });
}
