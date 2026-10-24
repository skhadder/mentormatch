import { connection } from "next/server";
import { body, fail, guard, ok } from "@/lib/api";
import { declineAllPending } from "@/lib/requests";
import { EDITABLE, validateMentor } from "@/lib/mentorSettings";
import { loadDb, mutate } from "@/lib/store";
import type { Mentor } from "@/lib/types";

// DEMO ONLY: there is no real login. The "View as mentor" selector picks an id,
// and these routes only ever return/modify that one mentor and their requests.

export async function GET(_req: Request, ctx: RouteContext<"/api/mentor/[id]">) {
  await connection();
  const { id } = await ctx.params;
  return guard(() => {
    const db = loadDb();
    const mentor = db.mentors.find((m) => m.id === id);
    if (!mentor) return fail("Mentor not found.", 404);
    const requests = db.requests
      .filter((r) => r.mentor_id === id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return ok({ mentor, requests });
  });
}

// Save settings. Rejects invalid combinations (e.g. 3x/month with a limit of 2).
export async function PATCH(req: Request, ctx: RouteContext<"/api/mentor/[id]">) {
  const { id } = await ctx.params;
  return guard(async () => {
    const patch = await body(req);
    return mutate((db) => {
      const mentor = db.mentors.find((m) => m.id === id);
      if (!mentor) return fail("Mentor not found.", 404);
      const next = { ...mentor } as Record<string, unknown>;
      for (const key of EDITABLE) if (key in patch) next[key] = patch[key];
      const merged = next as unknown as Mentor;
      if (merged.meeting_types && !merged.meeting_types.includes("group")) merged.group_size_max = null;
      const errors = validateMentor(merged);
      if (errors.length) return Response.json({ errors }, { status: 422 });
      Object.assign(mentor, merged);
      return ok({ mentor });
    });
  });
}

// "Remove my profile": withdraw consent. Pending requests are declined.
export async function DELETE(_req: Request, ctx: RouteContext<"/api/mentor/[id]">) {
  const { id } = await ctx.params;
  return guard(() =>
    mutate((db) => {
      const mentor = db.mentors.find((m) => m.id === id);
      if (!mentor) return fail("Mentor not found.", 404);
      mentor.opted_in = false;
      mentor.status = "paused";
      declineAllPending(db, id);
      return ok({ removed: true });
    }),
  );
}
