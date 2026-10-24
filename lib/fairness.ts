// Fairness check: runs the REAL matcher with different made-up names attached
// to one sample profile and compares the results.
import { matchMentors } from "./matching";
import type { Mentor, StudentProfile } from "./types";

export const FAIRNESS_NAMES = ["Maria", "James", "Aisha", "Wei", "Priya"];

export const SAMPLE_PROFILE: StudentProfile = {
  field: "Product Management",
  stage: "applying",
  target_role: "Product Manager",
  target_company: "Spotify",
  help_wanted: ["resume_review", "mock_interview"],
  meeting_type: "one_on_one",
  group_size: 1,
  open_to_group_with_others: false,
  cadence: "one_time",
  months: 1,
  major: "Business",
};

export interface FairnessRun {
  name: string;
  top: { mentorId: string; mentorName: string; score: number }[];
  differs: boolean; // true if this run differs from the first
}

export interface FairnessReport {
  pass: boolean;
  profile: StudentProfile;
  runs: FairnessRun[];
}

export function runFairnessCheck(
  mentors: Mentor[],
  profile: StudentProfile = SAMPLE_PROFILE,
  names: string[] = FAIRNESS_NAMES,
  matcher: typeof matchMentors = matchMentors, // injectable only so tests can prove FAIL is detected
): FairnessReport {
  const runs: FairnessRun[] = names.map((name) => {
    // The name rides along on the object; matchMentors must ignore it.
    const student = { ...profile, name } as StudentProfile;
    const top = matcher(student, mentors).map((r) => ({
      mentorId: r.mentor.id,
      mentorName: r.mentor.display_name,
      score: r.score,
    }));
    return { name, top, differs: false };
  });
  const key = (r: FairnessRun) => JSON.stringify(r.top.map((t) => [t.mentorId, t.score]));
  for (const r of runs) r.differs = key(r) !== key(runs[0]);
  return { pass: runs.every((r) => !r.differs) && runs[0].top.length > 0, profile, runs };
}
