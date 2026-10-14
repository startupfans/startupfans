import Link from "next/link";
import {
  formatRequestTime,
  joinRequestIntro,
  joinRequestLimitCopy,
  joinRequestWarning,
  type TeamJoinDecision,
} from "@/lib/team-requests";
import { JoinRequestForm } from "./join-request-form";

const buttonClass = "inline-flex min-h-11 w-full max-w-full items-center justify-center rounded-xl border-[3px] border-ink bg-pink px-5 py-3 font-display font-extrabold shadow-sticker transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink sm:w-auto";

function JoinRequestBody({ slug, decision }: { slug: string; decision: TeamJoinDecision | null }) {
  if (!decision) {
    return (
      <>
        <p className="mt-3 max-w-xl">{joinRequestLimitCopy} Sign in to ask this team to add you.</p>
        <Link href={`/login?${new URLSearchParams({ next: `/s/${slug}/team` })}`} className={`${buttonClass} mt-5`}>Request to join</Link>
      </>
    );
  }

  switch (decision.block) {
    case "member":
      return null;
    case "limit":
      return <p className="mt-3 max-w-xl">You&apos;ve used both join requests.</p>;
    case "cooldown":
      return (
        <p className="mt-3 max-w-xl">
          {joinRequestIntro(decision.remaining)}{" "}
          {decision.nextRequestAt
            ? `You can send another request after ${formatRequestTime(decision.nextRequestAt)}.`
            : "You can send another request in a week."}
        </p>
      );
    case "pending":
      return <p className="mt-3 max-w-xl">Request sent. An owner can add you from settings.</p>;
    case null:
      return (
        <>
          <p className="mt-3 max-w-xl">{joinRequestIntro(decision.remaining)}</p>
          <JoinRequestForm slug={slug} warning={joinRequestWarning(decision.remaining)} />
        </>
      );
    default: {
      const unreachable: never = decision.block;
      return unreachable;
    }
  }
}

export function JoinRequestCard({ slug, decision }: { slug: string; decision: TeamJoinDecision | null }) {
  if (decision?.block === "member") return null;

  return (
    <section aria-labelledby="join-request-heading" className="rounded-3xl border-[3px] border-ink bg-sun p-6 shadow-sticker sm:p-8">
      <h2 id="join-request-heading" className="font-display text-2xl font-extrabold">Ask to join</h2>
      <JoinRequestBody slug={slug} decision={decision} />
    </section>
  );
}
