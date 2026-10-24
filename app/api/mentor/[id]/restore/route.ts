import { fail, guard, ok } from "@/lib/api";
import { mutate } from "@/lib/store";

// Demo convenience: opt a removed demo mentor back in.
export async function POST(_req: Request, ctx: RouteContext<"/api/mentor/[id]/restore">) {
  const { id } = await ctx.params;
  return guard(() =>
    mutate((db) => {
      const mentor = db.mentors.find((m) => m.id === id);
      if (!mentor) return fail("Mentor not found.", 404);
      mentor.opted_in = true;
      return ok({ mentor });
    }),
  );
}
