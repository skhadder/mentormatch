import { guard, ok } from "@/lib/api";
import { runFairnessCheck } from "@/lib/fairness";
import { loadDb } from "@/lib/store";

// Runs the same matchMentors() the app uses, on the live mentor pool.
export async function POST() {
  return guard(() => ok(runFairnessCheck(loadDb().mentors)));
}
