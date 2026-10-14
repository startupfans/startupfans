import { renderNotificationEmail, type NotificationEmailContent } from "./notification";

export function reshareEmail(content: NotificationEmailContent) {
  return renderNotificationEmail(content, {
    subject: `${content.actor} reshared your post`, headline: "your post is travelling",
    sentence: `${content.actor} reshared your post on ${content.startup}`, button: "see the reshare",
  });
}
