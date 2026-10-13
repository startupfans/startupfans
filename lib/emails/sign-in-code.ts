import { renderEmail } from "./layout";

export function signInCodeEmail(code: string) {
  if (!/^\d{6}$/.test(code)) throw new Error("A sign-in code must contain six digits.");
  const email = renderEmail({
    subject: "Your startupfans sign-in code",
    badge: "Your fan club pass",
    badgeColor: "#b8f04a",
    headline: code,
    paragraphs: ["Enter this six-digit code in the startupfans app to sign in."],
    button: "Visit startupfans",
    url: "https://www.startupfans.co",
    notes: ["This code expires in 10 minutes and can be used once.", "If you didn't request this email, you can ignore it."],
  });
  return { ...email, text: `Sign-in code: ${code}\n\n${email.text}` };
}
