import { body, guard, ok, fail } from "@/lib/api";
import { parseProfile } from "@/lib/profile";
import { createRequest } from "@/lib/requests";
import { mutate } from "@/lib/store";

// The student writes and sends the message themselves; nothing is auto-sent.
export async function POST(req: Request) {
  return guard(async () => {
    const b = await body(req);
    const profile = parseProfile(b.profile);
    if (typeof profile === "string") return fail(profile);
    const request = mutate((db) => createRequest(db, profile, String(b.mentorId ?? ""), String(b.message ?? ""), String(b.studentName ?? "")));
    return ok({ request: { id: request.id, status: request.status } }, 201);
  });
}
