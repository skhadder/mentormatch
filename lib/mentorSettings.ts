// Validation for what a mentor can change in the portal.
import { SESSIONS_PER_MONTH } from "./labels";
import { CADENCES, HELP_TYPES, MEETING_TYPES, STAGES } from "./types";
import type { Mentor } from "./types";

// Fields a mentor may edit. Everything else (name, company…) is read-only here.
export const EDITABLE: (keyof Mentor)[] = [
  "stages", "help_types", "can_speak_to", "meeting_types", "group_size_max",
  "cadence_options", "max_engagement_months", "meeting_length_minutes",
  "monthly_limit", "status", "not_open_to",
];

export function validateMentor(m: Mentor): string[] {
  const errors: string[] = [];
  const has = (list: readonly string[], all: readonly string[]) => list.every((x) => all.includes(x));
  if (m.stages.length === 0 || !has(m.stages, STAGES)) errors.push("Choose at least one stage you want to help with.");
  if (m.help_types.length === 0 || !has(m.help_types, HELP_TYPES)) errors.push("Choose at least one kind of help you offer.");
  if (m.meeting_types.length === 0 || !has(m.meeting_types, MEETING_TYPES)) errors.push("Choose at least one meeting type.");
  if (m.cadence_options.length === 0 || !has(m.cadence_options, CADENCES)) errors.push("Choose at least one schedule.");
  if (m.meeting_types.includes("group")) {
    const g = m.group_size_max;
    if (!Number.isInteger(g) || (g as number) < 2 || (g as number) > 8) errors.push("Group size must be between 2 and 8.");
  }
  if (!Number.isInteger(m.max_engagement_months) || m.max_engagement_months < 1 || m.max_engagement_months > 3)
    errors.push("The longest plan must be 1 to 3 months.");
  if (![20, 30, 45].includes(m.meeting_length_minutes)) errors.push("Session length must be 20, 30, or 45 minutes.");
  if (!Number.isInteger(m.monthly_limit) || m.monthly_limit < 1) errors.push("Sessions per month must be at least 1.");
  else {
    const need = Math.max(0, ...m.cadence_options.map((c) => SESSIONS_PER_MONTH[c]));
    if (m.monthly_limit < need)
      errors.push(`Your schedules need at least ${need} sessions per month, but your limit is ${m.monthly_limit}. Raise the limit or remove a schedule.`);
  }
  if (!["active", "paused"].includes(m.status)) errors.push("Status must be active or paused.");
  return errors;
}

export function publicMentor(m: Mentor): Omit<Mentor, "owner_user"> {
  const { owner_user: _omit, ...rest } = m;
  void _omit;
  return rest;
}
