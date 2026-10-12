"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { followStartup, unfollowStartup } from "@/lib/follows";
import { getStartupBySlug } from "@/lib/startups";

export type FollowState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

export async function updateFollow(
  slug: string,
  _previousState: FollowState,
  formData: FormData,
): Promise<FollowState> {
  if (typeof slug !== "string" || !/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/.test(slug)) {
    return { status: "error", message: "This startup couldn't be found." };
  }
  const user = await requireUser(`/s/${slug}`);
  const intent = formData.get("intent");
  if (intent !== "follow" && intent !== "unfollow") {
    return { status: "error", message: "Choose follow or unfollow." };
  }

  try {
    const startup = await getStartupBySlug(slug);
    if (!startup) return { status: "error", message: "This startup couldn't be found." };
    if (intent === "follow") {
      await followStartup(user.id, startup.id);
    } else {
      await unfollowStartup(user.id, startup.id);
    }
  } catch (error) {
    console.error("[startupfans] Could not update follow.", error);
    return { status: "error", message: "We couldn't update your fan pass. Try again." };
  }
  revalidatePath(`/s/${slug}`);
  return { status: "success" };
}
