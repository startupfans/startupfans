import { renderNotificationEmail, type NotificationEmailContent } from "./notification";

export function newFanEmail(content: NotificationEmailContent) {
  const headline = content.more > 0 ? `${content.more + 1} new fans` : "a new fan";
  return renderNotificationEmail(content, {
    subject: headline, headline,
    sentence: `${content.actor} is now a fan of ${content.startup}`, button: "meet your fans",
  });
}
