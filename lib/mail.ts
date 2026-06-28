import "server-only";
import nodemailer, { Transporter } from "nodemailer";

let cached: Transporter | null = null;

function getTransport(): Transporter {
  if (cached) return cached;
  const host = process.env.SMTP_HOST;
  if (host) {
    cached = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  } else {
    // Dev fallback: prints the message instead of delivering it.
    cached = nodemailer.createTransport({ jsonTransport: true });
  }
  return cached;
}

export async function sendMail(opts: { to: string; subject: string; text: string }) {
  const from = process.env.MAIL_FROM || "store@example.com";
  try {
    const info = await getTransport().sendMail({ from, ...opts });
    if (!process.env.SMTP_HOST) {
      console.log(`[mail:dev] to=${opts.to} subject=${opts.subject}`);
    }
    return { ok: true, info };
  } catch (err) {
    console.error("[mail] send failed:", err);
    return { ok: false, error: err };
  }
}
