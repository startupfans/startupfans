"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isOptionalHttpsUrl, textField, updateProfile } from "@/lib/members";

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser("/me");
  const name = textField(formData, "name");
  const avatarUrl = textField(formData, "avatarUrl");
  if (name.length > 60) {
    redirect("/me?message=name-too-long");
  }
  if (!isOptionalHttpsUrl(avatarUrl)) {
    redirect("/me?message=invalid-avatar");
  }
  await updateProfile(user.id, name || null, avatarUrl || null);
  revalidatePath("/me");
  revalidatePath("/s/[slug]", "page");
  revalidatePath("/s/[slug]/settings", "page");
  revalidatePath("/s/[slug]/p/[postId]", "page");
  revalidatePath("/feed");
  redirect("/me?message=saved");
}
