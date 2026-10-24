import { body, fail, guard, ok } from "@/lib/api";
import { acceptRequest, declineRequest } from "@/lib/requests";
import { mutate } from "@/lib/store";

export async function POST(req: Request, ctx: RouteContext<"/api/mentor/[id]/requests/[rid]">) {
  const { id, rid } = await ctx.params;
  return guard(async () => {
    const action = (await body(req)).action;
    if (action !== "accept" && action !== "decline") return fail("Unknown action.");
    mutate((db) => (action === "accept" ? acceptRequest(db, id, rid) : declineRequest(db, id, rid)));
    return ok({ ok: true });
  });
}
