import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT || 587);
const from = process.argv[2] || process.env.MAIL_FROM || process.env.SMTP_USER;
const to = process.argv[3] || process.env.SMTP_USER;

const t = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

try {
  await t.verify();
  console.log(`verify OK (host=${host} port=${port})`);
  const info = await t.sendMail({
    from,
    to,
    subject: "SMTP connectivity test",
    text: "If you can read this, delivery works.",
  });
  console.log(`SENT from=${from} to=${to} id=${info.messageId}`);
  console.log(`response=${info.response}`);
  console.log(`accepted=${JSON.stringify(info.accepted)} rejected=${JSON.stringify(info.rejected)}`);
} catch (e) {
  console.log(`ERROR ${e.message}`);
}
