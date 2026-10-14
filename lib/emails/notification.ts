import { renderEmail } from "./layout";

export interface NotificationEmailContent {
  actor: string;
  startup: string;
  url: string;
  settingsUrl: string;
  unsubscribeUrl: string;
  excerpt: string;
  more: number;
}

export function renderNotificationEmail(content: NotificationEmailContent, copy: {
  subject: string; headline: string; sentence: string; button: string;
}) {
  const summary = content.more > 0 ? `and ${content.more} more` : "";
  return renderEmail({
    subject: copy.subject.replace(/[\r\n]+/g, " "),
    badge: "your startupfans", badgeColor: "#b8f04a",
    headline: copy.headline,
    paragraphs: [copy.sentence, ...(content.excerpt ? [content.excerpt] : []), ...(summary ? [summary] : [])],
    button: copy.button, url: content.url, notes: [], regularWeight: true,
    preferences: { settingsUrl: content.settingsUrl, unsubscribeUrl: content.unsubscribeUrl },
  });
}
