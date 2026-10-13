"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isOptionalHttpsUrl, textField, updateProfile } from "@/lib/members";
import { getMediaFormat, isMediaFilename } from "@/lib/media";
import { captureServerEvent } from "@/lib/posthog-server";

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

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser("/me");
  const name = textField(formData, "name");
  const avatarUrl = textField(formData, "avatarUrl");
  if (name.length > 60) {
    redirect("/me?message=name-too-long");
  }
  if (!isAvatarUrl(avatarUrl, user.id)) {
    redirect("/me?message=invalid-avatar");
  }
  await updateProfile(user.id, name || null, avatarUrl || null);
  await captureServerEvent({
    distinctId: user.id,
    event: "profile_updated",
    properties: {
      has_avatar: Boolean(avatarUrl),
      has_name: Boolean(name),
    },
  });
  revalidatePath("/me");
  revalidatePath("/s/[slug]", "page");
  revalidatePath("/s/[slug]/settings", "page");
  revalidatePath("/s/[slug]/p/[postId]", "page");
  revalidatePath("/feed");
  redirect("/me?message=saved");
}
