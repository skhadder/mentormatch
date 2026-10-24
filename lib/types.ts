// Shared types for MentorMatch.

export type CareerStage = "exploring" | "targeting" | "applying" | "interviewing";

// Kinds of help a student can ask for and a mentor can offer.
export type Topic =
  | "choosing a path"
  | "resume feedback"
  | "interview prep"
  | "understanding the role";

export interface Mentor {
  id: string;
  name: string; // display only — never used for matching
  field: string; // e.g. "SWE", "PM", "Data Science", "UX Design"
  role: string;
  company: string;
  yearsExperience: number;
  path: string; // short background, e.g. "switched from CS to product"
  careerStagesHelped: CareerStage[];
  topicsOpenTo: Topic[];
  monthlyLimit: number;
  requestsThisMonth: number;
  consentAt: string; // ISO date the mentor opted in
  visible: boolean; // mentor can hide themselves at any time
}

export interface Student {
  id: string;
  name: string; // display only — never used for matching
  careerStage: CareerStage;
  field: string; // a field name, or "not sure"
  targetCompany?: string;
  targetRole?: string;
  helpWanted: Topic[];
  major: string;
  background: string; // short free text
}

// Points contributed by each factor (already weighted).
export interface ScoreBreakdown {
  field: number;
  roleCompany: number;
  stage: number;
  topics: number;
  pathMajor: number;
  loadBalance: number;
}

export interface MatchResult {
  mentor: Mentor;
  score: number; // sum of breakdown, 0–100-ish
  breakdown: ScoreBreakdown;
}
