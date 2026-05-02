import * as Brevo from "@getbrevo/brevo";

const transactionalApi = new Brevo.TransactionalEmailsApi();

if (process.env.BREVO_API_KEY) {
  transactionalApi.setApiKey(
    Brevo.TransactionalEmailsApiApiKeys.apiKey,
    process.env.BREVO_API_KEY,
  );
}

export interface EmailPayload {
  to: Array<{ email: string; name?: string }>;
  subject: string;
  htmlContent: string;
  from?: { email: string; name?: string };
  replyTo?: { email: string; name?: string };
  tags?: string[];
}

export async function sendEmail(payload: EmailPayload): Promise<string> {
  if (!process.env.BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY is not configured");
  }

  const sender = payload.from ?? {
    email: process.env.BREVO_SENDER_EMAIL || "noreply@paperdb.dev",
    name: process.env.BREVO_SENDER_NAME || "PaperDB",
  };

  const response = await transactionalApi.sendTransacEmail({
    to: payload.to,
    sender,
    subject: payload.subject,
    htmlContent: payload.htmlContent,
    replyTo: payload.replyTo,
    tags: payload.tags,
    headers: {
      "X-Mailer": "PaperDB/1.0",
    },
  });

  return response.body.messageId || "unknown";
}

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
): Promise<string> {
  return sendEmail({
    to: [{ email }],
    subject: "Reset your PaperDB password",
    htmlContent: `
      <h2>Password reset request</h2>
      <p>We received a request to reset your PaperDB password.</p>
      <p>This link is valid for 1 hour.</p>
      <p>
        <a href="${resetUrl}" style="background:#0f766e;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block;">
          Reset password
        </a>
      </p>
      <p>If you did not request this, ignore this email.</p>
    `,
    tags: ["password-reset"],
  });
}
