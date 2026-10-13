import Image from "next/image";
import { Handle } from "@/app/components/handle";
import type { TeamMember } from "@/lib/startups";

const roles = {
  owner: { label: "Owner", color: "bg-sun" },
  editor: { label: "Editor", color: "bg-sky" },
} satisfies Record<TeamMember["role"], { label: string; color: string }>;

export function MemberCard({ member }: { member: TeamMember }) {
  const name = member.name?.trim() || member.handle;
  const role = roles[member.role];
  const joined = member.joinedAt.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <article className="min-w-0 rounded-2xl border-[3px] border-ink bg-white p-6 shadow-sticker">
      {member.avatarUrl ? (
        <Image src={member.avatarUrl} alt={`${name}'s avatar`} width={72} height={72} unoptimized referrerPolicy="no-referrer"
          className="h-18 w-18 rounded-full border-[3px] border-ink bg-cream object-cover" />
      ) : (
        <span aria-hidden="true" className="flex h-18 w-18 items-center justify-center rounded-full border-[3px] border-ink bg-lime font-display text-3xl font-extrabold">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      <div className="mt-4 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
        <h2 className="min-w-0 max-w-full break-words font-display text-2xl font-extrabold">{name}</h2>
        <Handle handle={member.handle} />
      </div>
      <span className={`mt-3 inline-block rounded-full border-2 border-ink px-3 py-1 text-sm font-bold ${role.color}`}>{role.label}</span>
      <p className="mt-4 text-sm font-semibold">{member.postCount.toLocaleString("en-GB")} {member.postCount === 1 ? "post" : "posts"}</p>
      <p className="mt-1 text-sm text-ink/70">Joined <time dateTime={member.joinedAt.toISOString().slice(0, 7)}>{joined}</time></p>
      {member.latestPostBody && (
        <blockquote className="mt-5 break-words border-l-[3px] border-ink pl-4 text-sm leading-relaxed text-ink/80">
          “{Array.from(member.latestPostBody).slice(0, 120).join("")}”
        </blockquote>
      )}
    </article>
  );
}
