"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { slackConnections, startups } from "@/db/schema";
import { isValidSessionId } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { inviteEmail } from "@/lib/emails/invite";
import { clearExpiredStartupInvites, createStartupInvite, revokeStartupInvite } from "@/lib/invites";
import { removeStartupMember, requireStartupOwner, setStartupMemberRole, textField, withOwnedStartup } from "@/lib/members";
import { captureServerEvent } from "@/lib/posthog-server";
import { isStartupProfileImageUrl, normalizeWebsiteUrl } from "@/lib/startups";
import { normalizeSocial, socialNetworks, type SocialField } from "@/lib/socials";

export type UpdateStartupField =
  | "name" | "tagline" | "description" | "bio" | "location" | "website" | "stage"
  | "logoUrl" | "coverUrl" | SocialField;

export type UpdateStartupState =
  | { status: "idle" }
  | { status: "error"; fieldErrors: Partial<Record<UpdateStartupField, string>> };

function refreshStartup(slug: string) {
  revalidatePath(`/s/${slug}`, "layout");
  revalidatePath("/feed");
  revalidatePath("/me");
}

function settingsMessage(slug: string, message: string): never {
  redirect(`/s/${slug}/settings?${new URLSearchParams({ message })}`);
}

export async function disconnectSlackAction(slug: string) {
  const { user } = await requireStartupOwner(slug, { allowSiteAdmin: false });
  await withOwnedStartup(slug, user.id, async (tx, startup) => {
    await tx.delete(slackConnections).where(eq(slackConnections.startupId, startup.id));
  }, { allowSiteAdmin: false });
  revalidatePath(`/s/${slug}/settings`);
  settingsMessage(slug, "slack-disconnected");
}

export async function updateStartupAction(
  slug: string,
  _previous: UpdateStartupState,
  formData: FormData,
): Promise<UpdateStartupState> {
  const { user } = await requireStartupOwner(slug);
  const name = textField(formData, "name");
  const tagline = textField(formData, "tagline");
  const description = textField(formData, "description");
  const bio = textField(formData, "bio");
  const location = textField(formData, "location");
  const logoUrl = textField(formData, "logoUrl");
  const coverUrl = textField(formData, "coverUrl");
  const websiteResult = normalizeWebsiteUrl(textField(formData, "website"));
  const stage = textField(formData, "stage");
  const fieldErrors: Partial<Record<UpdateStartupField, string>> = {};

  if (name.length < 2 || name.length > 60) {
    fieldErrors.name = "Choose a name between 2 and 60 characters.";
  }
  if (tagline.length > 120) fieldErrors.tagline = "Use up to 120 characters.";
  if (description.length > 2000) fieldErrors.description = "Use up to 2,000 characters.";
  if (bio.length > 280) fieldErrors.bio = "Use up to 280 characters.";
  if (location.length > 120) fieldErrors.location = "Use up to 120 characters.";
  if (logoUrl.length > 500) fieldErrors.logoUrl = "Use up to 500 characters.";
  else if (!isStartupProfileImageUrl(logoUrl, slug)) {
    fieldErrors.logoUrl = "Upload an image for this page or paste an https:// image URL.";
  }
  if (coverUrl.length > 500) fieldErrors.coverUrl = "Use up to 500 characters.";
  else if (!isStartupProfileImageUrl(coverUrl, slug)) {
    fieldErrors.coverUrl = "Upload an image for this page or paste an https:// image URL.";
  }
  if (websiteResult.status === "invalid") {
    fieldErrors.website = "Use a website address like yourstartup.com.";
  }
  if (stage && !["idea", "pre-seed", "seed", "series-a", "growth", "bootstrapped"].includes(stage)) {
    fieldErrors.stage = "Choose a stage from the list.";
  }
  const socials: Record<SocialField, string | null> = {
    xHandle: null, linkedinUrl: null, githubUrl: null,
    instagramHandle: null, youtubeUrl: null, tiktokHandle: null,
  };
  for (const { network, field, hint } of socialNetworks) {
    const result = normalizeSocial(network, textField(formData, field));
    if (result.status === "invalid") fieldErrors[field] = hint;
    else socials[field] = result.value;
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors };
  }
  if (websiteResult.status !== "valid") {
    return { status: "error", fieldErrors: { website: "Use a website address like yourstartup.com." } };
  }
  const website = websiteResult.value;
  await withOwnedStartup(slug, user.id, async (tx, startup) => {
    await tx.update(startups).set({
      name, tagline: tagline || null, description: description || null, logoUrl: logoUrl || null,
      coverUrl: coverUrl || null, bio: bio || null, location: location || null, ...socials,
      website, stage: stage || null,
    }).where(eq(startups.id, startup.id));
  });
  await captureServerEvent({
    distinctId: user.id,
    event: "startup_updated",
    properties: {
      has_website: Boolean(website),
      stage: stage || "unspecified",
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

export async function setMemberRoleAction(slug: string, formData: FormData) {
  const { user, isSiteAdmin } = await requireStartupOwner(slug);
  const memberId = textField(formData, "memberId");
  if (!isValidSessionId(memberId)) settingsMessage(slug, "invalid-member");
  const result = await setStartupMemberRole(slug, user.id, memberId, textField(formData, "role"));
  switch (result.status) {
    case "invalid-role":
      settingsMessage(slug, "invalid-role");
    case "last-owner":
      settingsMessage(slug, "last-owner");
    case "missing":
      settingsMessage(slug, "missing-member");
    case "unchanged":
    case "changed":
      refreshStartup(slug);
      if (memberId === user.id && result.status === "changed" && result.role === "editor" && !isSiteAdmin) {
        redirect(`/s/${slug}`);
      }
      settingsMessage(slug, "role-changed");
    default:
      result satisfies never;
  }
}

export async function clearExpiredInvitesAction(slug: string) {
  const { user } = await requireStartupOwner(slug);
  await clearExpiredStartupInvites(slug, user.id);
  revalidatePath(`/s/${slug}/settings`);
  settingsMessage(slug, "expired-invites-cleared");
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

  const url = await createStartupInvite(slug, user.id, email);
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
