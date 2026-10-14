import { notFound } from "next/navigation";
import { inviteEmail } from "@/lib/emails/invite";
import { magicLinkEmail } from "@/lib/emails/magic-link";
import { signInCodeEmail } from "@/lib/emails/sign-in-code";

import { mentionEmail } from "@/lib/emails/mention";
import { replyEmail } from "@/lib/emails/reply";
import { newFanEmail } from "@/lib/emails/new-fan";
import { reshareEmail } from "@/lib/emails/reshare";
import { teamJoinedEmail } from "@/lib/emails/team-joined";

const notificationSample = {
  actor: "alex", startup: "acme", url: "https://www.startupfans.co/notifications",
  settingsUrl: "https://www.startupfans.co/me/notifications",
  unsubscribeUrl: "https://www.startupfans.co/notifications/unsubscribe?sample=1",
  excerpt: "we just shipped the update you asked for.", more: 2,
};

export async function GET(request: Request, { params }: { params: Promise<{ name: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();

  const { name } = await params;
  const email = (() => {
    switch (name) {
      case "magic-link":
        return magicLinkEmail("https://www.startupfans.co/auth/verify?token=sample-sign-in-token&next=%2Ffeed");
      case "sign-in-code":
        return signInCodeEmail("123456");
      case "invite":
        return inviteEmail({
          startupName: "Acme", inviter: "Alex",
          url: "https://www.startupfans.co/join/sample-invite-token",
        });
      case "mention": return mentionEmail(notificationSample);
      case "reply": return replyEmail(notificationSample);
      case "new-fan": return newFanEmail({ ...notificationSample, excerpt: "" });
      case "reshare": return reshareEmail({ ...notificationSample, excerpt: "" });
      case "team-joined": return teamJoinedEmail({ ...notificationSample, excerpt: "" });
      default:
        notFound();
    }
  })();
  const text = new URL(request.url).searchParams.get("text") === "1";
  return new Response(text ? email.text : email.html, {
    headers: {
      "Content-Type": text ? "text/plain; charset=utf-8" : "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
