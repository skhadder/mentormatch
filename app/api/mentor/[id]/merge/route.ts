import { body, fail, guard, ok } from "@/lib/api";
import { mergeRequests } from "@/lib/requests";
import { mutate } from "@/lib/store";

export async function POST(req: Request, ctx: RouteContext<"/api/mentor/[id]/merge">) {
  const { id } = await ctx.params;
  return guard(async () => {
    const ids = (await body(req)).ids;
    if (!Array.isArray(ids) || !ids.every((x) => typeof x === "string")) return fail("ids must be a list of request ids.");
    if (ids.length > 20) return fail("You can merge at most 20 requests at a time.");
    return ok({ groupId: mutate((db) => mergeRequests(db, id, ids)) });
  });
}
