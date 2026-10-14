import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader, AppShell } from "@/app/components/app-shell";
import { PageHeader, SiteFooter } from "@/app/components/sticker";
import { requireUser } from "@/lib/auth";
import { getNotificationSettings } from "@/lib/notifications";
import { NotificationSettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Notifications · startupfans", robots: { index: false, follow: false } };

export async function NotificationSettingsPage() {
  const user = await requireUser("/me/notifications");
  const settings = await getNotificationSettings(user.id);
  return <div className="min-h-screen min-w-0">
    <AppHeader signedIn next="/me/notifications" />
    <AppShell className="max-w-xl">
      <PageHeader title="Notifications" actions={<Link prefetch={false} href="/notifications" className="inline-flex min-h-11 items-center underline underline-offset-4">your updates</Link>} />
      <NotificationSettingsForm settings={settings} />
      <SiteFooter />
    </AppShell>
  </div>;
}

export { NotificationSettingsPage as default };
