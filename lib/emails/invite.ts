import { renderEmail } from "./layout";

export function inviteEmail({ startupName, inviter, url }: {
  startupName: string;
  inviter: string;
  url: string;
}) {
  return renderEmail({
    subject: `${inviter.replace(/[\r\n]+/g, " ")} invited you to ${startupName.replace(/[\r\n]+/g, " ")} on startupfans`,
    badge: "You're on the list",
    badgeColor: "#ffd23f",
    headline: "You're invited.",
    paragraphs: [
      `${inviter} invited you to join ${startupName} on startupfans.`,
      "Your team shares what they're working on and what they've shipped, all on one page.",
    ],
    button: "Join the team",
    url,
    notes: ["This link expires in 7 days and can be used once."],
  });
}
