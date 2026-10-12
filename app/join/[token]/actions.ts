"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { acceptStartupInvite } from "@/lib/invites";

export async function acceptInviteAction(token: string) {
  const user = await requireUser(`/join/${token}`);
  const startup = await acceptStartupInvite(token, user.id);
  revalidatePath(`/join/${token}`);
  if (!startup) redirect(`/join/${token}?invalid=1`);
  revalidatePath(`/s/${startup.slug}`);
  revalidatePath(`/s/${startup.slug}/settings`);
  revalidatePath("/me");
  redirect(`/s/${startup.slug}`);
}
