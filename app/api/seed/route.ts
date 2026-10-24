import { guard, ok } from "@/lib/api";
import { resetDb } from "@/lib/store";

// Demo reset: replaces all mentors from data/mentors.json (no duplicates) and clears requests.
export async function POST() {
  return guard(() => {
    resetDb();
    return ok({ reset: true });
  });
}
