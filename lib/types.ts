// Shared types for MentorMatch. Nothing here stores contact details, gender,
// ethnicity, age, or photos.

export const STAGES = ["exploring", "targeting_role", "applying", "interviewing"] as const;
export type Stage = (typeof STAGES)[number];

export const HELP_TYPES = [
  "career_path_advice",
  "resume_review",
  "mock_interview",
  "company_insights",
  "role_deep_dive",
  "networking_advice",
  "portfolio_feedback",
] as const;
export type HelpType = (typeof HELP_TYPES)[number];

export const MEETING_TYPES = ["one_on_one", "group"] as const;
export type MeetingType = (typeof MEETING_TYPES)[number];

export const CADENCES = ["one_time", "monthly", "twice_monthly", "three_times_monthly"] as const;
export type Cadence = (typeof CADENCES)[number];

export type Channel = "video_call" | "phone_call" | "async_chat";

export interface Mentor {
  id: string;
  display_name: string; // display only — the matcher never reads this
  opted_in: boolean;
  status: "active" | "paused";
  field: string;
  role: string;
  company: string;
  industry: string;
  years_experience: number;
  major: string;
  switched_from_field: string | null;
  path_tags: string[];
  stages: Stage[];
  help_types: HelpType[];
  meeting_types: MeetingType[];
  group_size_max: number | null;
  cadence_options: Cadence[];
  max_engagement_months: number; // 1..3
  meeting_channel: Channel;
  meeting_length_minutes: number;
  monthly_limit: number; // sessions the mentor will host per month
  requests_this_month: number; // sessions already booked or pending
  not_open_to: string[];
  bio_for_explanations: string;
  can_speak_to: string[];
  owner_user: string | null; // unused in the demo (no real login)
}

export interface StudentProfile {
  field: string;
  stage: Stage;
  target_role: string;
  target_company: string;
  help_wanted: HelpType[];
  meeting_type: MeetingType;
  group_size: number; // includes the student; 1 for one-on-one
  open_to_group_with_others: boolean;
  cadence: Cadence;
  months: number; // 1..3
  major: string; // optional; used only for the path-overlap factor
}

export type Factor = "field" | "role" | "company" | "path" | "helpFit";

// Points per factor (already weighted). Skipped factors are 0.
export type FactorPoints = Record<Factor, number>;

// One chip on a result card. `matched` is derived from the same scoring data
// that produces the "Why this match" sentence.
export interface MatchedFactor {
  key: "field" | "role" | "company" | "stage" | "path" | "help";
  label: string;
  detail: string;
}

export interface MatchResult {
  mentor: Mentor;
  score: number; // final score after the fairness adjustment, 0..100
  baseScore: number; // before the fairness adjustment
  fairnessMultiplier: number; // 1 - 0.15 * requests_this_month / monthly_limit
  weights: FactorPoints; // weights used for this student (after redistribution)
  breakdown: FactorPoints; // points earned per factor
  matched: MatchedFactor[];
  sharedHelp: HelpType[];
}

export type RequestStatus = "pending" | "accepted" | "declined";

export interface MeetingRequest {
  id: string;
  student_profile: StudentProfile;
  mentor_id: string;
  meeting_type: MeetingType;
  group_size: number;
  cadence: Cadence;
  months: number;
  sessions_per_month: number;
  reserved_sessions_total: number; // sessions per month x months (1 for one_time)
  student_name?: string; // first and last name; missing on requests created before this field existed
  message: string; // written and sent by the student
  status: RequestStatus;
  created_at: string;
  merge_group_id: string | null; // set when the mentor merges group requests
  reservation_held: boolean; // false once this request's sessions were released
}
