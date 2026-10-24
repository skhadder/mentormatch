import { connection } from "next/server";
import { loadDb } from "@/lib/store";
import { guard, ok } from "@/lib/api";

// Distinct fields from the mentor data, for the intake dropdown.
export async function GET() {
  await connection();
  return guard(() => ok({ fields: [...new Set(loadDb().mentors.map((m) => m.field))].sort() }));
}
