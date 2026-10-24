import { connection } from "next/server";
import { fail, guard, ok } from "@/lib/api";
import { publicMentor } from "@/lib/mentorSettings";
import { loadDb } from "@/lib/store";

// Public view of one mentor (never contact details; none are stored).
export async function GET(_req: Request, ctx: RouteContext<"/api/mentors/[id]">) {
  await connection();
  const { id } = await ctx.params;
  return guard(() => {
    const m = loadDb().mentors.find((x) => x.id === id && x.opted_in);
    return m ? ok({ mentor: publicMentor(m) }) : fail("That mentor could not be found.", 404);
  });
}
