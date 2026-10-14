"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { notificationKinds, notificationSettings, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { captureServerEvent } from "@/lib/posthog-server";

export type NotificationSettingsState = { status: "idle" | "saved" | "error" };

export async function saveNotificationSettings(_previous: NotificationSettingsState, data: FormData): Promise<NotificationSettingsState> {
  const user = await requireUser("/me/notifications");
  const keys = ["emailPaused", ...notificationKinds.flatMap((kind) => [`${kind}-inApp`, `${kind}-email`])];
  for (const key of keys) {
    if (data.getAll(key).length > 1 || (data.has(key) && data.get(key) !== "on")) return { status: "error" };
  }
  try {
    await db.transaction(async (tx) => {
      await tx.update(users).set({ emailPaused: data.has("emailPaused") }).where(eq(users.id, user.id));
      for (const kind of notificationKinds) {
        const values = { userId: user.id, kind, inApp: data.has(`${kind}-inApp`), email: data.has(`${kind}-email`) };
        await tx.insert(notificationSettings).values(values).onConflictDoUpdate({
          target: [notificationSettings.userId, notificationSettings.kind], set: { inApp: values.inApp, email: values.email },
        });
      }
    });
  } catch { return { status: "error" }; }
  revalidatePath("/me/notifications");
  revalidatePath("/notifications");
  await captureServerEvent({ distinctId: user.id, event: "notification_settings_updated", properties: { email_paused: data.has("emailPaused") } });
  return { status: "saved" };
}
