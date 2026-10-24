// Plain-language labels shared by the UI, templates, and the matcher.
import type { Cadence, HelpType, MeetingType, Stage } from "./types";

export const STAGE_LABELS: Record<Stage, string> = {
  exploring: "Exploring",
  targeting_role: "Targeting a role",
  applying: "Applying",
  interviewing: "Interviewing",
};

export const STAGE_DESCRIPTIONS: Record<Stage, string> = {
  exploring: "Still figuring out what fits",
  targeting_role: "I know what I want, I need a path",
  applying: "Sending applications",
  interviewing: "Interviews are coming up",
};

export const HELP_LABELS: Record<HelpType, string> = {
  career_path_advice: "Career path advice",
  resume_review: "Resume review",
  mock_interview: "Mock interview",
  company_insights: "Company insights",
  role_deep_dive: "Role deep dive",
  networking_advice: "Networking advice",
  portfolio_feedback: "Portfolio feedback",
};

export const MEETING_LABELS: Record<MeetingType, string> = {
  one_on_one: "One-on-one",
  group: "Small group",
};

export const CADENCE_LABELS: Record<Cadence, string> = {
  one_time: "One conversation",
  monthly: "Once a month",
  twice_monthly: "Every two weeks",
  three_times_monthly: "Three times a month",
};

// Sessions per month each cadence needs from the mentor.
export const SESSIONS_PER_MONTH: Record<Cadence, number> = {
  one_time: 1,
  monthly: 1,
  twice_monthly: 2,
  three_times_monthly: 3,
};

export function reservedSessions(cadence: Cadence, months: number): number {
  return cadence === "one_time" ? 1 : SESSIONS_PER_MONTH[cadence] * months;
}
