"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { startups } from "@/db/schema";
import { isValidSessionId } from "@/lib/auth";
import { createStartupInvite, revokeStartupInvite } from "@/lib/invites";
import { isOptionalHttpsUrl, removeStartupMember, requireStartupOwner, textField, withOwnedStartup } from "@/lib/members";

function refreshStartup(slug: string) {
  revalidatePath(`/s/${slug}`, "layout");
  revalidatePath("/feed");
  revalidatePath("/me");
}

function settingsMessage(slug: string, message: string): never {
  redirect(`/s/${slug}/settings?${new URLSearchParams({ message })}`);
}

export async function updateStartupAction(slug: string, formData: FormData) {
  const { user } = await requireStartupOwner(slug);
  const name = textField(formData, "name");
  const tagline = textField(formData, "tagline");
  const description = textField(formData, "description");
  const logoUrl = textField(formData, "logoUrl");
  const website = textField(formData, "website");
  const stage = textField(formData, "stage");
  const rawTeamSize = textField(formData, "teamSize");
  const teamSize = rawTeamSize ? Number(rawTeamSize) : null;

  if (name.length < 2 || name.length > 60) settingsMessage(slug, "Choose a name between 2 and 60 characters.");
  if (tagline.length > 120 || description.length > 2000) {
    settingsMessage(slug, "Use up to 120 characters for the tagline and 2,000 for the description.");
  }
  if (!isOptionalHttpsUrl(logoUrl) || !isOptionalHttpsUrl(website)) {
    settingsMessage(slug, "Use a full https:// address for your logo and website.");
  }
  if (stage && !["idea", "pre-seed", "seed", "series-a", "growth", "bootstrapped"].includes(stage)) {
    settingsMessage(slug, "Choose a stage from the list.");
  }
  if (teamSize !== null && (!/^\d+$/.test(rawTeamSize) || !Number.isInteger(teamSize) || teamSize < 1 || teamSize > 10000)) {
    settingsMessage(slug, "Team size must be a whole number from 1 to 10,000.");
  }
  await withOwnedStartup(slug, user.id, async (tx, startup) => {
    await tx.update(startups).set({
      name, tagline: tagline || null, description: description || null, logoUrl: logoUrl || null,
      website: website || null, stage: stage || null, teamSize,
    }).where(eq(startups.id, startup.id));
  });
  refreshStartup(slug);
  settingsMessage(slug, "Page saved.");
}

export async function removeMemberAction(slug: string, formData: FormData) {
  const { user } = await requireStartupOwner(slug);
  const memberId = textField(formData, "memberId");
  if (!isValidSessionId(memberId)) settingsMessage(slug, "Choose a member from the list.");
  const result = await removeStartupMember(slug, user.id, memberId);
  switch (result.status) {
    case "last-owner":
      settingsMessage(slug, "Keep at least one owner on your page.");
    case "missing":
      settingsMessage(slug, "This person is already out of the team.");
    case "removed":
      refreshStartup(slug);
      if (memberId === user.id) redirect(`/s/${slug}`);
      settingsMessage(slug, "Member removed.");
    default:
      result satisfies never;
  }
}

export async function createInviteAction(slug: string) {
  const { user } = await requireStartupOwner(slug);
  const url = await createStartupInvite(slug, user.id);
  revalidatePath(`/s/${slug}/settings`);
  return url;
}

export async function revokeInviteAction(slug: string, formData: FormData) {
  const { user } = await requireStartupOwner(slug);
  const hash = textField(formData, "tokenHash");
  if (!/^[0-9a-f]{64}$/.test(hash)) settingsMessage(slug, "Choose an invite from the list.");
  await revokeStartupInvite(slug, user.id, hash);
  revalidatePath(`/s/${slug}/settings`);
  revalidatePath("/join/[token]", "page");
  settingsMessage(slug, "Invite revoked.");
}
