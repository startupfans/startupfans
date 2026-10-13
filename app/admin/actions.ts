"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { deletePostAsAdmin, deleteStartupAsAdmin, requireAdmin } from "@/lib/admin";
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
  await requireAdmin();
  if (formData.get("confirm") !== "delete") notFound();
  const startup = await deleteStartupAsAdmin(slug);
  revalidatePath(`/s/${startup.slug}`, "layout");
  revalidatePath("/feed");
  revalidatePath("/me");
  revalidatePath("/admin");
  redirect("/feed");
}
