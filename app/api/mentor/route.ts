import { connection } from "next/server";
import { guard, ok } from "@/lib/api";
import { loadDb } from "@/lib/store";

// Demo only: the list behind the "View as mentor" selector.
export async function GET() {
  await connection();
  return guard(() =>
    ok({
      mentors: loadDb().mentors.map((m) => ({
        id: m.id, display_name: m.display_name, role: m.role, company: m.company, opted_in: m.opted_in,
      })),
    }),
  );
}
