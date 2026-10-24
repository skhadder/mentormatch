// Validates and normalizes a student's intake answers from the client.
import { CADENCES, HELP_TYPES, MEETING_TYPES, STAGES } from "./types";
import type { StudentProfile } from "./types";

export function parseProfile(input: unknown): StudentProfile | string {
  const o = (input ?? {}) as Record<string, unknown>;
  const str = (v: unknown, max = 80) => (typeof v === "string" ? v.trim().slice(0, max) : "");

  const field = str(o.field);
  if (!field) return "Please choose a field of interest.";
  if (!STAGES.includes(o.stage as never)) return "Please choose your career stage.";
  const help = Array.isArray(o.help_wanted) ? o.help_wanted.filter((h) => HELP_TYPES.includes(h as never)) : [];
  if (help.length === 0) return "Please choose at least one kind of help.";
  const meeting_type = MEETING_TYPES.includes(o.meeting_type as never) ? (o.meeting_type as StudentProfile["meeting_type"]) : "one_on_one";
  const cadence = CADENCES.includes(o.cadence as never) ? (o.cadence as StudentProfile["cadence"]) : "one_time";
  const clamp = (v: unknown, lo: number, hi: number, d: number) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
  };

  return {
    field,
    stage: o.stage as StudentProfile["stage"],
    target_role: str(o.target_role),
    target_company: str(o.target_company),
    help_wanted: [...new Set(help)] as StudentProfile["help_wanted"],
    meeting_type,
    group_size: meeting_type === "group" ? clamp(o.group_size, 2, 6, 3) : 1,
    open_to_group_with_others: meeting_type === "group" && o.open_to_group_with_others === true,
    cadence,
    months: cadence === "one_time" ? 1 : clamp(o.months, 1, 3, 1),
    major: str(o.major),
  };
}
