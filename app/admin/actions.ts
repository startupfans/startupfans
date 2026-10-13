"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { startups } from "@/db/schema";
import { deletePostAsAdmin, requireAdmin } from "@/lib/admin";
import { requireStartupOwner, withOwnedStartup } from "@/lib/members";
import { resolvePostReports } from "@/lib/reports";

export async function resolveReportsAction(postId: string) {
  if (!await resolvePostReports(postId)) notFound();
  revalidatePath("/admin");
}

export async function deleteReportedPostAction(postId: string, formData: FormData) {
  await requireAdmin();
  if (formData.get("confirm") !== "delete") notFound();
  const { slug } = await deletePostAsAdmin(postId);
  revalidatePath(`/s/${slug}`);
  revalidatePath(`/s/${slug}/p/${postId}`);
  revalidatePath("/feed");
  revalidatePath("/admin");
}

export async function deleteStartupAction(slug: string, formData: FormData) {
  if (typeof slug !== "string" || !/^[a-z0-9-]{1,40}$/.test(slug)) notFound();
  const { user } = await requireStartupOwner(slug);
  if (formData.get("confirm") !== "delete") notFound();
  await withOwnedStartup(slug, user.id, async (tx, startup) => {
    await tx.delete(startups).where(eq(startups.id, startup.id));
  });
  revalidatePath(`/s/${slug}`, "layout");
  revalidatePath("/feed");
  revalidatePath("/me");
  revalidatePath("/admin");
  redirect("/me?message=startup-deleted");
}
