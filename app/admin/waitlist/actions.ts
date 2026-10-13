"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { letInWaitlist, syncGetWaitlist } from "@/lib/waitlist";

function finish(message: string) {
  revalidatePath("/admin/waitlist");
  revalidatePath("/s/startupfans");
  revalidatePath("/me");
  redirect(`/admin/waitlist?${new URLSearchParams({ message })}`);
}

async function admit(selection: Parameters<typeof letInWaitlist>[0]) {
  let message: string;
  try {
    const result = await letInWaitlist(selection);
    message = `Sent ${result.sent} welcome emails. ${result.previewed} development previews, ${result.skipped} skipped, ${result.alreadyOnTeam} already on a team, ${result.failed} failed.`;
    if (result.errors.length) message += ` ${result.errors.join(" ")}`;
  } catch (error) {
    message = error instanceof Error ? error.message : "Could not let people in.";
  }
  finish(message);
}

export async function letInFirstAction(formData: FormData) {
  await requireAdmin();
  const value = formData.get("count");
  await admit({ kind: "first", count: typeof value === "string" ? Number(value) : NaN });
}

export async function letInEntryAction(id: string) {
  await requireAdmin();
  await admit({ kind: "entry", id, resend: false });
}

export async function resendEntryAction(id: string) {
  await requireAdmin();
  await admit({ kind: "entry", id, resend: true });
}

export async function syncWaitlistAction() {
  await requireAdmin();
  let message: string;
  try {
    const result = await syncGetWaitlist();
    message = `Synced ${result.imported} entries. ${result.skipped} spam or invalid entries skipped.`;
  } catch (error) {
    message = error instanceof Error ? error.message : "Could not sync the waitlist.";
  }
  finish(message);
}
