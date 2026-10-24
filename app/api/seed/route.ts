import { fail, guard, ok } from "@/lib/api";
import { resetDb } from "@/lib/store";

// Demo reset: replaces all mentors from data/mentors.json (no duplicates) and clears requests.
// Disabled in production. If SEED_SECRET is set, callers must send it in x-seed-secret.
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") return new Response(null, { status: 404 });
  const secret = process.env.SEED_SECRET;
  if (secret && req.headers.get("x-seed-secret") !== secret) return fail("Not allowed.", 403);
  return guard(() => {
    resetDb();
    return ok({ reset: true });
  });
}
