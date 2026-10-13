"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { updateStartupFollow } from "@/lib/follows";
import { captureServerEvent } from "@/lib/posthog-server";
import { getStartupBySlug } from "@/lib/startups";
import type { FollowState } from "./actions";

const followErrorMessages = {
  missing: "That startup does not exist.",
  self: "A startup cannot follow itself.",
  forbidden: "You must be on that startup's team.",
};

async function changeStartupFollow(slug: string, followerSlug: string, following: boolean): Promise<FollowState> {
  const validSlug = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;
  if (typeof slug !== "string" || typeof followerSlug !== "string"
    || !validSlug.test(slug) || !validSlug.test(followerSlug)) {
    return { status: "error", message: followErrorMessages.missing };
  }
  if (slug === followerSlug) return { status: "error", message: followErrorMessages.self };
  const user = await requireUser(`/s/${slug}`);
  try {
    const [startup, follower] = await Promise.all([getStartupBySlug(slug), getStartupBySlug(followerSlug)]);
    if (!startup || !follower) return { status: "error", message: followErrorMessages.missing };
    const result = await updateStartupFollow(user.id, startup.id, follower.id, following);
    if (result.status !== "success") {
      return { status: "error", message: followErrorMessages[result.status] };
    }
    if (result.changed) {
      await captureServerEvent({
        distinctId: user.id,
        event: following ? "startup_followed_as_startup" : "startup_unfollowed_as_startup",
        properties: { startup_id: startup.id, follower_startup_id: follower.id },
      });
    }
  } catch {
    return { status: "error", message: "We couldn't update your startup's fan pass. Try again." };
  }
  revalidatePath(`/s/${slug}`);
  revalidatePath(`/s/${slug}/fans`);
  revalidatePath(`/s/${followerSlug}`);
  revalidatePath(`/s/${followerSlug}/following`);
  revalidatePath("/leaderboard");
  return { status: "success" };
}

export async function followAsStartup(slug: string, followerSlug: string) {
  return changeStartupFollow(slug, followerSlug, true);
}

export async function unfollowAsStartup(slug: string, followerSlug: string) {
  return changeStartupFollow(slug, followerSlug, false);
}

export async function updateFollowAsStartup(slug: string, _previousState: FollowState, formData: FormData): Promise<FollowState> {
  const followerSlug = formData.get("followerSlug");
  const intent = formData.get("intent");
  if (typeof followerSlug !== "string" || (intent !== "follow" && intent !== "unfollow")) {
    return { status: "error", message: "Choose a startup and follow or unfollow." };
  }
  return changeStartupFollow(slug, followerSlug, intent === "follow");
}
