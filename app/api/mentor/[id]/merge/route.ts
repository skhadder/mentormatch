import { body, guard, ok } from "@/lib/api";
import { mergeRequests } from "@/lib/requests";
import { mutate } from "@/lib/store";

export async function POST(req: Request, ctx: RouteContext<"/api/mentor/[id]/merge">) {
  const { id } = await ctx.params;
  return guard(async () => {
    const ids = ((await body(req)).ids as string[]) ?? [];
    return ok({ groupId: mutate((db) => mergeRequests(db, id, ids)) });
  });
}
