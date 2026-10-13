import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();

  return Response.json(
    { signedIn: user !== null, name: user?.name ?? null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
