import type { Mentor, StudentProfile } from "./types";
import { CADENCES } from "./types";
import { CADENCE_LABELS, CADENCE_LABELS as C, HELP_LABELS, MEETING_LABELS, STAGE_LABELS } from "./labels";

// "One-on-one or group up to 4 · Monthly for up to 3 months"
export function offersLine(m: Pick<Mentor, "meeting_types" | "group_size_max" | "cadence_options" | "max_engagement_months">): string {
  const types = m.meeting_types
    .map((t) => (t === "group" ? `group up to ${m.group_size_max}` : MEETING_LABELS[t].toLowerCase()))
    .join(" or ");
  const cadences = CADENCES.filter((c) => m.cadence_options.includes(c)).map((c) => CADENCE_LABELS[c].toLowerCase());
  const plan = m.cadence_options.some((c) => c !== "one_time") ? ` for up to ${m.max_engagement_months} month${m.max_engagement_months > 1 ? "s" : ""}` : "";
  return `${types[0].toUpperCase()}${types.slice(1)} · ${cadences.join(", ")}${plan}`;
}

export function meetingSummary(p: StudentProfile): string {
  const who = p.meeting_type === "group" ? `Small group of ${p.group_size}` : "One-on-one";
  const when = p.cadence === "one_time" ? C.one_time.toLowerCase() : `${C[p.cadence].toLowerCase()} for ${p.months} month${p.months > 1 ? "s" : ""}`;
  return `${who}, ${when}`;
}

export function searchSummary(p: StudentProfile): [string, string][] {
  return [
    ["Stage", STAGE_LABELS[p.stage]],
    ["Field", p.field],
    ["Help", p.help_wanted.map((h) => HELP_LABELS[h]).join(", ")],
    ["Meeting", p.meeting_type === "group" ? `Small group of ${p.group_size}` : "Just me"],
    ["Schedule", p.cadence === "one_time" ? CADENCE_LABELS.one_time : `${CADENCE_LABELS[p.cadence]} for ${p.months} month${p.months > 1 ? "s" : ""}`],
  ];
}
