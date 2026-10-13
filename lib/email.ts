import "server-only";

interface Email {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export type EmailDelivery =
  | { delivered: true }
  | { delivered: false; preview: { subject: string; text: string } };

export async function sendEmail({ to, subject, html, text }: Email): Promise<EmailDelivery> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[startupfans email: dev fallback] To: ${to}\n${subject}\n${text}`);
    return { delivered: false, preview: { subject, text } };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "startupfans <fans@startupfans.co>",
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Email delivery failed (${response.status}).`);
  }
  return { delivered: true };
}
