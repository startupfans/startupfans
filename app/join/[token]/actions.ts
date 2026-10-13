"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { acceptStartupInvite, isInviteToken } from "@/lib/invites";
import { captureServerEvent } from "@/lib/posthog-server";

export async function acceptInviteAction(token: string) {
  if (typeof token !== "string" || !isInviteToken(token)) notFound();
  const user = await getCurrentUser();
  if (!user) redirect(`/login?${new URLSearchParams({ next: `/join/${token}`, invite: token })}`);
  const startup = await acceptStartupInvite(token, user.id);
  revalidatePath(`/join/${token}`);
  if (!startup) redirect(`/join/${token}?invalid=1`);
  if (startup.status === "already-member") redirect(`/join/${token}`);
  await captureServerEvent({ distinctId: user.id, event: "startup_invite_accepted", properties: { kind: startup.kind } });
  revalidatePath(`/s/${startup.slug}`);
  revalidatePath(`/s/${startup.slug}/settings`);
  revalidatePath("/me");
  redirect(`/s/${startup.slug}`);
}
