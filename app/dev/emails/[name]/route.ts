import { notFound } from "next/navigation";
import { inviteEmail } from "@/lib/emails/invite";
import { magicLinkEmail } from "@/lib/emails/magic-link";
import { signInCodeEmail } from "@/lib/emails/sign-in-code";

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
