import { renderEmail } from "./layout";

export function welcomeEmail(url: string, memberNo: number) {
  return renderEmail({
    subject: "you're off the waitlist 🎟️",
    badge: "Your fan club pass",
    badgeColor: "#b8f04a",
    headline: "Welcome to the club.",
    paragraphs: [
      `you joined the startupfans waitlist, and the doors are open. you're fan #${memberNo}.`,
      "startupfans is where early startups post what they're shipping: updates, launches, team photos. follow the ones you like and see it as it happens.",
      "building something? create a page for your startup and get your team posting. it's free.",
    ],
    button: "Sign in",
    url,
    notes: ["This link expires in 7 days and can be used once. After that, sign in with your email at startupfans.co."],
  });
}
