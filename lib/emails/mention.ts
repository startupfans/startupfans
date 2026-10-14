import { renderNotificationEmail, type NotificationEmailContent } from "./notification";

export function mentionEmail(content: NotificationEmailContent) {
  return renderNotificationEmail(content, {
    subject: `${content.actor} mentioned you`, headline: "you got a mention",
    sentence: `${content.actor} mentioned you on ${content.startup}`, button: "see the mention",
  });
}
