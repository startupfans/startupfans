import { createShareImage } from "@/app/share-image";
import { getStartupBySlug, getStartupFanCount } from "@/lib/startups";

export const alt = "Follow this startup on startupfans.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const startup = await getStartupBySlug(slug);
  if (!startup) return createShareImage();

  const fanCount = await getStartupFanCount(startup.id);
  return createShareImage({ name: startup.name, tagline: startup.tagline, fanCount });
}
