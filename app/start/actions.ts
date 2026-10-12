"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isValidSlug } from "@/lib/slug";
import { createStartup } from "@/lib/startups";

export type CreateStartupState =
  | { status: "idle" }
  | { status: "error"; message: string };

function textField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isHttpsUrl(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return value.startsWith("https://") && url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
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
  const logoUrl = textField(formData, "logoUrl");
  const website = textField(formData, "website");
  const stage = textField(formData, "stage");
  const rawTeamSize = textField(formData, "teamSize");
  const teamSize = rawTeamSize ? Number(rawTeamSize) : null;

  if (name.length < 2 || name.length > 60) {
    return { status: "error", message: "Choose a name between 2 and 60 characters." };
  }
  if (!isValidSlug(slug)) {
    return { status: "error", message: "Choose an available address like your-startup: 3 to 40 lowercase letters, numbers or hyphens, starting and ending with a letter or number." };
  }
  if (tagline.length > 120 || description.length > 2000) {
    return { status: "error", message: "Use up to 120 characters for the tagline and 2,000 for the description." };
  }
  if (logoUrl.length > 500 || website.length > 500) {
    return { status: "error", message: "Use up to 500 characters for your logo and website addresses." };
  }
  if (!isHttpsUrl(logoUrl) || !isHttpsUrl(website)) {
    return { status: "error", message: "Use a full https:// address for your logo and website." };
  }
  if (stage && !["idea", "pre-seed", "seed", "series-a", "growth", "bootstrapped"].includes(stage)) {
    return { status: "error", message: "Choose a stage from the list." };
  }
  if (teamSize !== null && (!/^\d+$/.test(rawTeamSize) || !Number.isInteger(teamSize) || teamSize < 1 || teamSize > 10000)) {
    return { status: "error", message: "Team size must be a whole number from 1 to 10,000." };
  }

  let startup;
  try {
    startup = await createStartup({
      name, slug, tagline: tagline || null, description: description || null,
      logoUrl: logoUrl || null, website: website || null, stage: stage || null,
      teamSize, createdBy: user.id,
    });
  } catch (error) {
    console.error("[startupfans] Could not create startup.", error);
    return { status: "error", message: "We couldn't create your page. Try again in a moment." };
  }
  if (!startup) {
    return { status: "error", message: "That page address is taken. Try another one." };
  }
  revalidatePath(`/s/${startup.slug}`);
  redirect(`/s/${startup.slug}`);
}
