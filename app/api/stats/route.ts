import { getPlatformStats } from "@/lib/stats";

export async function GET() {
  const stats = await getPlatformStats();

  return Response.json(stats, {
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
    },
  });
}
