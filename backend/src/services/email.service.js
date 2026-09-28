// backend/src/services/email.service.js
import { getTransporter, MAIL_FROM_NAME, MAIL_FROM_EMAIL } from "../config/mailer.js";

const otpEmailTemplate = ({ name, otp, purpose }) => {
  const purposeMap = {
    REGISTER: {
      title: "Verify Your Email",
      badgeText: "Email Verification",
      badgeColor: "#4f46e5",
      badgeBg: "#eef2ff",
      introMessage: "Thank you for joining Waypoint! Please use the verification code below to verify your email address and activate your account.",
    },
    PASSWORD_RESET: {
      title: "Reset Your Password",
      badgeText: "Password Reset",
      badgeColor: "#ef4444",
      badgeBg: "#fef2f2",
      introMessage: "We received a request to reset your password for your Waypoint account. Use the one-time verification code below to proceed.",
    },
    EMAIL_CHANGE: {
      title: "Confirm Email Change",
      badgeText: "Email Change",
      badgeColor: "#0ea5e9",
      badgeBg: "#f0f9ff",
      introMessage: "We received a request to update your Waypoint account email. Use the one-time verification code below to confirm.",
    },
  };

  const config = purposeMap[purpose] || purposeMap.REGISTER;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.title} - Waypoint</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">

  <!-- Preview Text -->
  <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">
    Your Waypoint verification code is ${otp}
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f1f5f9; padding: 40px 16px;">
    <tr>
      <td align="center">

        <!-- Main Card -->
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 540px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); overflow: hidden; border: 1px solid #e2e8f0;">

          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #f1f5f9; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">
                🧭 Way<span style="color: #6366f1;">point</span>
              </h1>
              <p style="margin: 6px 0 0; color: #94a3b8; font-size: 13px; font-weight: 500;">
                Dependency-Aware Code Review Orchestration
              </p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px 32px 24px;">

              <!-- Purpose Badge -->
              <div style="margin-bottom: 20px;">
                <span style="display: inline-block; background-color: ${config.badgeBg}; color: ${config.badgeColor}; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">
                  ${config.badgeText}
                </span>
              </div>

              <h2 style="margin: 0 0 12px; color: #0f172a; font-size: 20px; font-weight: 600;">
                ${config.title}
              </h2>

              <p style="margin: 0 0 16px; color: #475569; font-size: 15px; line-height: 1.6;">
                Hello <strong>${name || "there"}</strong>,
              </p>

              <p style="margin: 0 0 24px; color: #475569; font-size: 15px; line-height: 1.6;">
                ${config.introMessage}
              </p>

              <!-- OTP Display Box -->
              <div style="text-align: center; margin: 28px 0; padding: 24px; background-color: #f8fafc; border-radius: 12px; border: 1px dashed #cbd5e1;">
                <span style="display: block; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                  Your One-Time Code
                </span>
                <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #4f46e5;">
                  ${otp}
                </div>
                <span style="display: block; font-size: 13px; color: #64748b; margin-top: 10px;">
                  ⏱️ Valid for <strong>10 minutes</strong>
                </span>
              </div>

              <!-- Security Notice -->
              <p style="margin: 0 0 16px; color: #64748b; font-size: 14px; line-height: 1.5;">
                If you did not request this verification, someone may have entered your email by mistake. You can safely ignore this message.
              </p>

              <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 28px 0;" />

              <!-- Signoff -->
              <p style="margin: 0; color: #94a3b8; font-size: 13px; line-height: 1.5;">
                Best regards,<br>
                <strong style="color: #475569;">The Waypoint Team</strong>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                This is an automated security email from Waypoint. Please do not reply directly to this email.
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
};

// Flexible function supporting both: sendOtpEmail(to, otp, purpose, name) AND sendOtpEmail({ to, otp, purpose, name })
export const sendOtpEmail = async (param1, param2, param3, param4) => {
  let to, otp, purpose, name;

  if (typeof param1 === "object" && param1 !== null) {
    ({ to, otp, purpose = "REGISTER", name = "" } = param1);
  } else {
    to = param1;
    otp = param2;
    purpose = param3 || "REGISTER";
    name = param4 || "";
  }

  const subjectMap = {
    REGISTER: "Waypoint - Verify Your Email Address",
    PASSWORD_RESET: "Waypoint - Password Reset Code",
    EMAIL_CHANGE: "Waypoint - Confirm Email Change Code",
  };

  try {
    const mailer = await getTransporter();

    await mailer.sendMail({
      from: `"${MAIL_FROM_NAME}" <${MAIL_FROM_EMAIL}>`,
      to,
      subject: subjectMap[purpose] || "Waypoint - Verification Code",
      text: `Your Waypoint verification code is: ${otp}. This code expires in 10 minutes.`,
      html: otpEmailTemplate({
        name,
        otp,
        purpose,
      }),
    });

    console.log(`[email] OTP successfully sent to ${to}`);
  } catch (err) {
    console.error("SMTP send error:", err.message);

    // In local development, log the OTP to console so testing isn't blocked if SMTP credentials are not yet configured
    if (process.env.NODE_ENV === "development") {
      console.log(`\n[DEV FALLBACK] OTP for ${to} (${purpose}) is: ${otp}\n`);
      return;
    }

    throw new Error("Failed to send email. Please try again later.");
  }
};
