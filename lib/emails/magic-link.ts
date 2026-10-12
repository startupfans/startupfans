import { renderEmail } from "./layout";

export function magicLinkEmail(url: string) {
  return renderEmail({
    subject: "Your startupfans sign-in link",
    badge: "Your fan club pass",
    badgeColor: "#b8f04a",
    headline: "Welcome to the club.",
    paragraphs: ["Your inside track on startups starts here. Sign in to follow your favourites and see what they're shipping."],
    button: "Sign in",
    url,
    notes: [
      "This link expires in 15 minutes and can be used once.",
      "If you didn't request this email, you can ignore it.",
    ],
  });
}
