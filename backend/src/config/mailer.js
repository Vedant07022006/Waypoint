import nodemailer from "nodemailer";

let transporter;

export const getTransporter = async () => {
  if (transporter) return transporter;

  const port = Number(process.env.SMTP_PORT) || 587;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465, // true for 465 (SSL), false for 587 (STARTTLS)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.verify();
  console.log("✅ SMTP connected successfully:", process.env.SMTP_HOST);

  return transporter;
};

export const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || "Waypoint";
export const MAIL_FROM_EMAIL = process.env.MAIL_FROM || process.env.SMTP_USER;