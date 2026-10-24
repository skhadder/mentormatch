import { body, guard, ok } from "@/lib/api";
import { loadDb } from "@/lib/store";

// Lets a student see the status of requests they sent (ids kept in their browser).
export async function POST(req: Request) {
  return guard(async () => {
    const ids = ((await body(req)).ids as unknown[]) ?? [];
    const db = loadDb();
    const requests = db.requests
      .filter((r) => ids.includes(r.id))
      .map((r) => {
        const m = db.mentors.find((x) => x.id === r.mentor_id);
        return {
          id: r.id,
          status: r.status,
          created_at: r.created_at,
          meeting_type: r.meeting_type,
          cadence: r.cadence,
          months: r.months,
          mentor: m ? { display_name: m.display_name, role: m.role, company: m.company } : null,
        };
      });
    return ok({ requests });
  });
}
