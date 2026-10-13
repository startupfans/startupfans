import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";

export async function GET() {
  const user = await getCurrentUser();

  return Response.json(
    { signedIn: user !== null, name: user?.name ?? null, admin: isAdmin(user) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
