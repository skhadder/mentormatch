// Transparent mentor matching.
//
// Fairness rule: scoring uses ONLY job-relevant traits (field, role, company,
// career stage, topics, path/major). It never reads `name`, and the data has no
// gender, ethnicity, age, or photo fields to read.

import type {
  CareerStage,
  MatchResult,
  Mentor,
  ScoreBreakdown,
  Student,
} from "./types";

export const MAX_RESULTS = 3;
// Extra points (on top of 100) for mentors with spare capacity.
export const LOAD_BALANCE_MAX = 5;

type Weights = Omit<ScoreBreakdown, "loadBalance">;

// Max points per factor for each career stage. Each row sums to 100.
export const STAGE_WEIGHTS: Record<CareerStage, Weights> = {
  exploring: { field: 30, roleCompany: 5, stage: 15, topics: 20, pathMajor: 30 },
  targeting: { field: 30, roleCompany: 15, stage: 15, topics: 20, pathMajor: 20 },
  applying: { field: 15, roleCompany: 35, stage: 15, topics: 25, pathMajor: 10 },
  interviewing: { field: 15, roleCompany: 35, stage: 20, topics: 25, pathMajor: 5 },
};

// Words too common to signal a real similarity.
const STOPWORDS = new Set([
  "a", "an", "and", "the", "of", "to", "in", "on", "for", "with", "from", "into",
  "who", "that", "is", "was", "at", "as", "by", "or", "turned", "moved", "switched",
  "started", "degree", "major", "senior", "junior", "staff", "lead", "now", "then",
]);

const norm = (s: string) => s.trim().toLowerCase();

function tokens(text: string): Set<string> {
  return new Set(
    norm(text)
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 1 && !STOPWORDS.has(w)),
  );
}

// Each factor returns 0..1; the stage weights turn that into points.

function fieldScore(student: Student, mentor: Mentor): number {
  if (norm(student.field) === "not sure") return 0.5; // neutral, doesn't favor anyone
  return norm(student.field) === norm(mentor.field) ? 1 : 0;
}

function roleCompanyScore(student: Student, mentor: Mentor): number {
  const { targetCompany, targetRole } = student;
  if (!targetCompany && !targetRole) return 0.5; // nothing to compare: neutral
  let score = 0;
  let parts = 0;
  if (targetCompany) {
    parts++;
    if (norm(targetCompany) === norm(mentor.company)) score += 1;
  }
  if (targetRole) {
    parts++;
    // Share of the target role's words that appear in the mentor's role.
    const want = tokens(targetRole);
    const have = tokens(mentor.role);
    if (want.size > 0) {
      score += [...want].filter((w) => have.has(w)).length / want.size;
    }
  }
  return score / parts;
}

function stageScore(student: Student, mentor: Mentor): number {
  return mentor.careerStagesHelped.includes(student.careerStage) ? 1 : 0;
}

function topicScore(student: Student, mentor: Mentor): number {
  if (student.helpWanted.length === 0) return 0;
  const shared = student.helpWanted.filter((t) => mentor.topicsOpenTo.includes(t));
  return shared.length / student.helpWanted.length;
}

// Overlap between the student's major/background and the mentor's field/path.
// Three shared keywords counts as a full match.
function pathScore(student: Student, mentor: Mentor): number {
  const a = tokens(`${student.major} ${student.background}`);
  const b = tokens(`${mentor.field} ${mentor.path}`);
  const shared = [...a].filter((w) => b.has(w)).length;
  return Math.min(shared / 3, 1);
}

const round1 = (n: number) => Math.round(n * 10) / 10;

// Returns the top 3 mentors for a student, each with a per-factor breakdown.
export function matchMentors(student: Student, mentors: Mentor[]): MatchResult[] {
  const w = STAGE_WEIGHTS[student.careerStage];

  const results: MatchResult[] = mentors
    // 1. Hard filters: visible, has capacity, and offers some help the student wants.
    .filter((m) => m.visible)
    .filter((m) => m.requestsThisMonth < m.monthlyLimit)
    .filter((m) => student.helpWanted.some((t) => m.topicsOpenTo.includes(t)))
    // 2. Score each remaining mentor.
    .map((mentor) => {
      const breakdown: ScoreBreakdown = {
        field: round1(fieldScore(student, mentor) * w.field),
        roleCompany: round1(roleCompanyScore(student, mentor) * w.roleCompany),
        stage: round1(stageScore(student, mentor) * w.stage),
        topics: round1(topicScore(student, mentor) * w.topics),
        pathMajor: round1(pathScore(student, mentor) * w.pathMajor),
        // Small boost for mentors with more spare capacity, to spread the load.
        loadBalance: round1(
          LOAD_BALANCE_MAX * (1 - mentor.requestsThisMonth / mentor.monthlyLimit),
        ),
      };
      const score = round1(Object.values(breakdown).reduce((a, b) => a + b, 0));
      return { mentor, score, breakdown };
    });

  // 3. Highest score first; ties broken by mentor id so results are deterministic.
  results.sort((a, b) => b.score - a.score || a.mentor.id.localeCompare(b.mentor.id));
  return results.slice(0, MAX_RESULTS);
}
