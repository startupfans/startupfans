"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { isOptionalHttpsUrl, textField, updateProfile } from "@/lib/members";
import { getMediaFormat, isMediaFilename } from "@/lib/media";
import { captureServerEvent } from "@/lib/posthog-server";
import { normalizeSocial, socialNetworks, type SocialField } from "@/lib/socials";

export type UpdateProfileField = "name" | "avatarUrl" | SocialField;

export interface UpdateProfileValues {
  name: string;
  avatarUrl: string;
  xHandle: string;
  linkedinUrl: string;
  githubUrl: string;
  instagramHandle: string;
  youtubeUrl: string;
  tiktokHandle: string;
}

export type UpdateProfileState =
  | { status: "idle" }
  | {
    status: "error";
    fieldErrors: Partial<Record<UpdateProfileField, string>>;
    values: UpdateProfileValues;
  }
  | { status: "saved"; values: UpdateProfileValues };

function isAvatarUrl(value: string, userId: string) {
  if (!isOptionalHttpsUrl(value)) return false;
  if (!value) return true;
  const url = new URL(value);
  const hostname = url.hostname.replace(/\.$/, "");
  if (hostname !== "blob.vercel-storage.com" && !hostname.endsWith(".blob.vercel-storage.com")) return true;
  const prefix = `/users/${userId}/avatar/`;
  const filename = url.pathname.slice(prefix.length);
  return /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/i.test(url.hostname)
    && !url.port && !url.search && !url.hash && url.pathname.startsWith(prefix)
    && isMediaFilename(filename) && getMediaFormat(filename)?.type === "image";
}

function readUpdateValues(formData: FormData): UpdateProfileValues {
  return {
    name: textField(formData, "name"),
    avatarUrl: textField(formData, "avatarUrl"),
    xHandle: textField(formData, "xHandle"),
    linkedinUrl: textField(formData, "linkedinUrl"),
    githubUrl: textField(formData, "githubUrl"),
    instagramHandle: textField(formData, "instagramHandle"),
    youtubeUrl: textField(formData, "youtubeUrl"),
    tiktokHandle: textField(formData, "tiktokHandle"),
  };
}

function refreshProfile(handle: string) {
  revalidatePath("/me");
  revalidatePath(`/u/${handle}`);
  revalidatePath("/s/[slug]", "page");
  revalidatePath("/s/[slug]/settings", "page");
  revalidatePath("/s/[slug]/p/[postId]", "page");
  revalidatePath("/feed");
}

export async function updateProfileAction(
  _previous: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const user = await requireUser("/me");
  const values = readUpdateValues(formData);
  const fieldErrors: Partial<Record<UpdateProfileField, string>> = {};

  if (values.name.length > 60) {
    fieldErrors.name = "Use up to 60 characters for your name.";
  }
  if (!isAvatarUrl(values.avatarUrl, user.id)) {
    fieldErrors.avatarUrl = "Upload your own avatar or use a full https:// image address.";
  }

  const socials: Record<SocialField, string | null> = {
    xHandle: null, linkedinUrl: null, githubUrl: null,
    instagramHandle: null, youtubeUrl: null, tiktokHandle: null,
  };
  for (const { network, field, personalHint } of socialNetworks) {
    const result = normalizeSocial(network, values[field]);
    if (result.status === "invalid") fieldErrors[field] = personalHint;
    else socials[field] = result.value;
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors, values };
  }

  await updateProfile(user.id, {
    name: values.name || null,
    avatarUrl: values.avatarUrl || null,
    ...socials,
  });
  await captureServerEvent({
    distinctId: user.id,
    event: "profile_updated",
    properties: {
      has_avatar: Boolean(values.avatarUrl),
      has_name: Boolean(values.name),
      has_socials: socialNetworks.some(({ field }) => Boolean(socials[field])),
    },
  });
  refreshProfile(user.handle);
  return {
    status: "saved",
    values: {
      ...values,
      xHandle: socials.xHandle ?? "",
      linkedinUrl: socials.linkedinUrl ?? "",
      githubUrl: socials.githubUrl ?? "",
      instagramHandle: socials.instagramHandle ?? "",
      youtubeUrl: socials.youtubeUrl ?? "",
      tiktokHandle: socials.tiktokHandle ?? "",
    },
  };
}
