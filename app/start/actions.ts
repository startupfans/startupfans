"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isValidSlug } from "@/lib/slug";
import { createStartup, isStartupProfileImageUrl, normalizeWebsiteUrl } from "@/lib/startups";
import { captureServerEvent } from "@/lib/posthog-server";
import { emitPostHogLog } from "@/lib/posthog-logs";

export type CreateStartupState =
  | { status: "idle" }
  | { status: "error"; message: string };

function textField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createStartupAction(
  _previousState: CreateStartupState,
  formData: FormData,
): Promise<CreateStartupState> {
  const user = await requireUser("/start");
  const name = textField(formData, "name");
  const slug = textField(formData, "slug");
  const tagline = textField(formData, "tagline");
  const description = textField(formData, "description");
  const bio = textField(formData, "bio");
  const logoUrl = textField(formData, "logoUrl");
  const coverUrl = textField(formData, "coverUrl");
  const websiteResult = normalizeWebsiteUrl(textField(formData, "website"));
  const stage = textField(formData, "stage");

  if (name.length < 2 || name.length > 60) {
    return { status: "error", message: "Choose a name between 2 and 60 characters." };
  }
  if (!isValidSlug(slug)) {
    return { status: "error", message: "Choose an available address like your-startup: 3 to 40 lowercase letters, numbers or hyphens, starting and ending with a letter or number." };
  }
  if (tagline.length > 120 || description.length > 2000 || bio.length > 280) {
    return { status: "error", message: "Use up to 120 characters for the tagline, 280 for the bio and 2,000 for the description." };
  }
  if (logoUrl.length > 500) {
    return { status: "error", message: "Use up to 500 characters for your logo address." };
  }
  if (!isStartupProfileImageUrl(logoUrl, slug, user.id)) {
    return { status: "error", message: "Upload a logo for this page address or use a full https:// image URL." };
  }
  if (coverUrl.length > 500) {
    return { status: "error", message: "Use up to 500 characters for your cover address." };
  }
  if (!isStartupProfileImageUrl(coverUrl, slug, user.id)) {
    return { status: "error", message: "Upload a cover for this page address or use a full https:// image URL." };
  }
  if (websiteResult.status === "invalid") {
    return { status: "error", message: "Use a website address like yourstartup.com." };
  }
  if (stage && !["idea", "pre-seed", "seed", "series-a", "growth", "bootstrapped"].includes(stage)) {
    return { status: "error", message: "Choose a stage from the list." };
  }

  const website = websiteResult.value;

  let startup;
  try {
    startup = await createStartup({
      name, slug, tagline: tagline || null, description: description || null,
      bio: bio || null,
      logoUrl: logoUrl || null, coverUrl: coverUrl || null, website, stage: stage || null,
      createdBy: user.id,
    });
  } catch (error) {
    console.error("[startupfans] Could not create startup.", error);
    return { status: "error", message: "We couldn't create your page. Try again in a moment." };
  }
  if (!startup) {
    return { status: "error", message: "That page address is taken. Try another one." };
  }
  await captureServerEvent({
    distinctId: user.id,
    event: "startup_created",
    properties: {
      has_website: Boolean(website),
      stage: stage || "unspecified",
    },
  });
  await emitPostHogLog("startup_created");
  revalidatePath(`/s/${startup.slug}`);
  redirect(`/s/${startup.slug}`);
}
