"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { blockedJoinRequestMessage, requestTeamJoin } from "@/lib/team-requests";

export type JoinRequestState =
  | { status: "idle" }
  | { status: "sent" }
  | { status: "error"; message: string };

export async function requestToJoinAction(slug: string, _previous: JoinRequestState, formData: FormData): Promise<JoinRequestState> {
  void formData;
  const user = await requireUser(`/s/${slug}/team`);
  const result = await requestTeamJoin(user.id, slug);
  switch (result.status) {
    case "missing-startup":
      notFound();
    case "sent":
      revalidatePath(`/s/${slug}`, "layout");
      return { status: "sent" };
    case "blocked":
      revalidatePath(`/s/${slug}/team`);
      return { status: "error", message: blockedJoinRequestMessage(result.decision) };
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
}
