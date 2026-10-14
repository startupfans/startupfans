import { renderNotificationEmail, type NotificationEmailContent } from "./notification";

export function teamJoinedEmail(content: NotificationEmailContent) {
  return renderNotificationEmail(content, {
    subject: `${content.actor} joined your team`, headline: "your team grew",
    sentence: `${content.actor} joined ${content.startup}`, button: "see your team",
  });
}
