"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { slackConnections, startups } from "@/db/schema";
import { isValidSessionId } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { inviteEmail } from "@/lib/emails/invite";
import { createStartupInvite, revokeStartupInvite } from "@/lib/invites";
import { isOptionalHttpsUrl, removeStartupMember, requireStartupOwner, textField, withOwnedStartup } from "@/lib/members";
import { captureServerEvent } from "@/lib/posthog-server";
import { isStartupProfileImageUrl } from "@/lib/startups";
import { normalizeSocial, socialNetworks, type SocialField } from "@/lib/socials";

function refreshStartup(slug: string) {
  revalidatePath(`/s/${slug}`, "layout");
  revalidatePath("/feed");
  revalidatePath("/me");
}

function settingsMessage(slug: string, message: string): never {
  redirect(`/s/${slug}/settings?${new URLSearchParams({ message })}`);
}

export async function disconnectSlackAction(slug: string) {
  const { user } = await requireStartupOwner(slug);
  await withOwnedStartup(slug, user.id, async (tx, startup) => {
    await tx.delete(slackConnections).where(eq(slackConnections.startupId, startup.id));
  });
  revalidatePath(`/s/${slug}/settings`);
  settingsMessage(slug, "slack-disconnected");
}

export async function updateStartupAction(slug: string, formData: FormData) {
  const { user } = await requireStartupOwner(slug);
  const name = textField(formData, "name");
  const tagline = textField(formData, "tagline");
  const description = textField(formData, "description");
  const bio = textField(formData, "bio");
  const location = textField(formData, "location");
  const logoUrl = textField(formData, "logoUrl");
  const coverUrl = textField(formData, "coverUrl");
  const website = textField(formData, "website");
  const stage = textField(formData, "stage");
  const rawTeamSize = textField(formData, "teamSize");
  const teamSize = rawTeamSize ? Number(rawTeamSize) : null;

  if (name.length < 2 || name.length > 60) settingsMessage(slug, "invalid-name");
  if (tagline.length > 120 || description.length > 2000 || bio.length > 280 || location.length > 120) {
    settingsMessage(slug, "text-too-long");
  }
  if (logoUrl.length > 500 || coverUrl.length > 500 || website.length > 500) {
    settingsMessage(slug, "url-too-long");
  }
  if (!isStartupProfileImageUrl(logoUrl, slug) || !isStartupProfileImageUrl(coverUrl, slug) || !isOptionalHttpsUrl(website)) {
    settingsMessage(slug, "invalid-url");
  }
  if (stage && !["idea", "pre-seed", "seed", "series-a", "growth", "bootstrapped"].includes(stage)) {
    settingsMessage(slug, "invalid-stage");
  }
  if (teamSize !== null && (!/^\d+$/.test(rawTeamSize) || !Number.isInteger(teamSize) || teamSize < 1 || teamSize > 10000)) {
    settingsMessage(slug, "invalid-team-size");
  }
  const socials: Record<SocialField, string | null> = {
    xHandle: null, linkedinUrl: null, githubUrl: null,
    instagramHandle: null, youtubeUrl: null, tiktokHandle: null,
  };
  for (const { network, field } of socialNetworks) {
    const result = normalizeSocial(network, textField(formData, field));
    if (result.status === "invalid") settingsMessage(slug, `invalid-social-${network}`);
    socials[field] = result.value;
  }
  await withOwnedStartup(slug, user.id, async (tx, startup) => {
    await tx.update(startups).set({
      name, tagline: tagline || null, description: description || null, logoUrl: logoUrl || null,
      coverUrl: coverUrl || null, bio: bio || null, location: location || null, ...socials,
      website: website || null, stage: stage || null, teamSize,
    }).where(eq(startups.id, startup.id));
  });
  await captureServerEvent({
    distinctId: user.id,
    event: "startup_updated",
    properties: {
      has_website: Boolean(website),
      stage: stage || "unspecified",
      team_size_provided: teamSize !== null,
    },
  });
  refreshStartup(slug);
  settingsMessage(slug, "saved");
}

export async function removeMemberAction(slug: string, formData: FormData) {
  const { user } = await requireStartupOwner(slug);
  const memberId = textField(formData, "memberId");
  if (!isValidSessionId(memberId)) settingsMessage(slug, "invalid-member");
  const result = await removeStartupMember(slug, user.id, memberId);
  switch (result.status) {
    case "last-owner":
      settingsMessage(slug, "last-owner");
    case "missing":
      settingsMessage(slug, "missing-member");
    case "removed":
      refreshStartup(slug);
      if (memberId === user.id) redirect(`/s/${slug}`);
      settingsMessage(slug, "member-removed");
    default:
      result satisfies never;
  }
}

export async function createInviteAction(slug: string) {
  const { user } = await requireStartupOwner(slug);
  const url = await createStartupInvite(slug, user.id);
  await captureServerEvent({ distinctId: user.id, event: "startup_invite_created" });
  revalidatePath(`/s/${slug}/settings`);
  return url;
}

export async function sendInviteAction(slug: string, formData: FormData) {
  const { user, startup } = await requireStartupOwner(slug);
  const email = textField(formData, "email").toLowerCase();
  if (
    email.length > 254 ||
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(email) ||
    email.startsWith(".") || email.includes("..") || email.includes(".@") ||
    email.split("@")[0].length > 64
  ) {
    settingsMessage(slug, "invalid-email");
  }

  const url = await createStartupInvite(slug, user.id);
  try {
    await sendEmail({
      to: email,
      ...inviteEmail({ startupName: startup.name, inviter: user.name?.trim() || user.email, url }),
    });
  } catch (error) {
    console.error("[startupfans invites] Could not send an invite.", error);
    revalidatePath(`/s/${slug}/settings`);
    settingsMessage(slug, "invite-send-failed");
  }
  await captureServerEvent({ distinctId: user.id, event: "startup_invite_sent" });
  revalidatePath(`/s/${slug}/settings`);
  settingsMessage(slug, "invite-sent");
}

export async function revokeInviteAction(slug: string, formData: FormData) {
  const { user } = await requireStartupOwner(slug);
  const hash = textField(formData, "tokenHash");
  if (!/^[0-9a-f]{64}$/.test(hash)) settingsMessage(slug, "invalid-invite");
  await revokeStartupInvite(slug, user.id, hash);
  revalidatePath(`/s/${slug}/settings`);
  revalidatePath("/join/[token]", "page");
  settingsMessage(slug, "invite-revoked");
}
