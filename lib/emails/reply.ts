import { renderNotificationEmail, type NotificationEmailContent } from "./notification";

export function replyEmail(content: NotificationEmailContent, toReply = false) {
  return renderNotificationEmail(content, {
    subject: `${content.actor} replied to you`, headline: "a reply for you",
    sentence: toReply ? `${content.actor} replied to your reply` : `${content.actor} replied to your post on ${content.startup}`,
    button: "see the reply",
  });
}
