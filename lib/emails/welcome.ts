import { renderEmail } from "./layout";

export function welcomeEmail(url: string, memberNo: number) {
  return renderEmail({
    subject: "You're in",
    badge: "Your fan club pass",
    badgeColor: "#b8f04a",
    headline: "Welcome to the club.",
    paragraphs: [`You're fan #${memberNo} of startupfans.`],
    button: "Sign in",
    url,
    notes: ["This link expires in 7 days and can be used once."],
  });
}
