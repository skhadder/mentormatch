// Mentor matching — plain, deterministic code. No AI is involved.
//
// Fairness rule: scoring uses ONLY job-relevant traits. It never reads
// `display_name` or any demographic field (none exist in the data model).

import { SESSIONS_PER_MONTH } from "./labels";
import type {
  Factor,
  FactorPoints,
  MatchedFactor,
  MatchResult,
  Mentor,
  Stage,
  StudentProfile,
} from "./types";
import { HELP_TYPES } from "./types";
import { HELP_LABELS } from "./labels";

export const MAX_RESULTS = 3;
// Largest score reduction for a mentor who is completely booked.
export const FAIRNESS_PENALTY = 0.15;

// Points per factor by stage (each row sums to 100).
export const STAGE_WEIGHTS: Record<Stage, FactorPoints> = {
  exploring: { field: 40, role: 10, company: 5, path: 35, helpFit: 10 },
  targeting_role: { field: 30, role: 30, company: 10, path: 25, helpFit: 5 },
  applying: { field: 15, role: 30, company: 30, path: 15, helpFit: 10 },
  interviewing: { field: 10, role: 30, company: 35, path: 10, helpFit: 15 },
};

// Fields that are close enough to earn half the field points.
const RELATED_FIELDS: [string, string][] = [
  ["Software Engineering", "Data Science"],
  ["Software Engineering", "Product Management"],
  ["Product Management", "Data Science"],
  ["Product Management", "UX Design"],
  ["Product Management", "Marketing"],
  ["UX Design", "UX Research"],
  ["UX Research", "Marketing"],
  ["UX Research", "Product Management"],
  ["Data Science", "Finance"],
  ["Data Science", "Healthcare"],
  ["Marketing", "Nonprofit"],
  ["Education", "Nonprofit"],
  ["Education", "Healthcare"],
];

const norm = (s: string) => s.trim().toLowerCase();

const STOPWORDS = new Set(["a", "an", "and", "of", "the", "in", "at", "for", "senior", "junior", "lead", "staff", "associate"]);
// Titles that mean the same thing for our purposes.
const SYNONYMS: Record<string, string> = {
  developer: "engineer",
  swe: "engineer",
  analyst: "analyst",
  designer: "designer",
  pm: "product",
};

function words(text: string): Set<string> {
  return new Set(
    norm(text)
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 1 && !STOPWORDS.has(w))
      .map((w) => SYNONYMS[w] ?? w),
  );
}

// ---- Step 1: hard filters --------------------------------------------------

// Returns the reason a mentor is filtered out, or null if they qualify.
export function filterReason(student: StudentProfile, m: Mentor): string | null {
  if (!m.opted_in) return "not opted in";
  if (m.status === "paused") return "paused";
  if (!m.stages.includes(student.stage)) return "does not help this stage";
  if (!student.help_wanted.some((h) => m.help_types.includes(h))) return "offers none of the help wanted";
  if (!m.meeting_types.includes(student.meeting_type)) return "does not offer this meeting type";
  if (student.meeting_type === "group" && (m.group_size_max ?? 0) < student.group_size) return "group too large";
  if (!m.cadence_options.includes(student.cadence)) return "does not offer this schedule";
  if (student.months > m.max_engagement_months && student.cadence !== "one_time") return "plan too long";
  if (m.monthly_limit - m.requests_this_month < SESSIONS_PER_MONTH[student.cadence]) return "not enough sessions left";
  return null;
}

// ---- Step 2: factor scores (each 0..1) ------------------------------------

function fieldScore(student: StudentProfile, m: Mentor): number {
  if (norm(student.field) === norm(m.field)) return 1;
  const related = RELATED_FIELDS.some(
    ([a, b]) =>
      (norm(a) === norm(student.field) && norm(b) === norm(m.field)) ||
      (norm(b) === norm(student.field) && norm(a) === norm(m.field)),
  );
  return related ? 0.5 : 0;
}

function roleScore(student: StudentProfile, m: Mentor): number {
  const want = words(student.target_role);
  if (want.size === 0) return 0;
  const have = words(m.role);
  return [...want].filter((w) => have.has(w)).length / want.size;
}

function companyScore(student: StudentProfile, m: Mentor): number {
  return norm(student.target_company) === norm(m.company) ? 1 : 0;
}

// Same major, same field switched from, and shared path tags — capped at 1.
function pathScore(student: StudentProfile, m: Mentor): number {
  const major = norm(student.major);
  let score = 0;
  if (norm(m.major) === major) score += 0.5;
  if (m.switched_from_field && norm(m.switched_from_field) === major) score += 0.3;
  const mine = words(student.major);
  const shared = m.path_tags.filter((t) => [...words(t.replace(/-/g, " "))].some((w) => mine.has(w))).length;
  score += Math.min(shared, 2) * 0.1;
  return Math.min(score, 1);
}

function sharedHelp(student: StudentProfile, m: Mentor) {
  return HELP_TYPES.filter((h) => student.help_wanted.includes(h) && m.help_types.includes(h));
}

// Weights for this student: if target role/company/major were left blank,
// that factor is ignored and its weight is spread over the rest proportionally.
export function weightsFor(student: StudentProfile): FactorPoints {
  const base = STAGE_WEIGHTS[student.stage];
  const skipped: Factor[] = [];
  if (!student.target_role.trim()) skipped.push("role");
  if (!student.target_company.trim()) skipped.push("company");
  if (!student.major.trim()) skipped.push("path");
  const kept = (Object.keys(base) as Factor[]).filter((f) => !skipped.includes(f));
  const keptTotal = kept.reduce((s, f) => s + base[f], 0);
  const out = { field: 0, role: 0, company: 0, path: 0, helpFit: 0 } as FactorPoints;
  for (const f of kept) out[f] = (base[f] / keptTotal) * 100;
  return out;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function matchedFactors(student: StudentProfile, m: Mentor, raw: Record<Factor, number>, shared: ReturnType<typeof sharedHelp>): MatchedFactor[] {
  const chips: MatchedFactor[] = [];
  if (raw.field > 0)
    chips.push({ key: "field", label: "Field", detail: raw.field === 1 ? `works in ${m.field}` : `works in ${m.field}, a related field` });
  if (raw.role > 0) chips.push({ key: "role", label: "Role", detail: `is ${/^[aeiou]/i.test(m.role) ? "an" : "a"} ${m.role}` });
  if (raw.company > 0) chips.push({ key: "company", label: "Company", detail: `works at ${m.company}` });
  chips.push({ key: "stage", label: "Stage", detail: "helps students who are in your stage" });
  if (raw.path > 0) chips.push({ key: "path", label: "Path overlap", detail: `has a similar path (${m.major}${m.switched_from_field ? `, switched from ${m.switched_from_field}` : ""})` });
  if (shared.length > 0)
    chips.push({ key: "help", label: "Offers the help you want", detail: `offers ${shared.map((h) => HELP_LABELS[h].toLowerCase()).join(", ")}` });
  return chips;
}

// ---- Steps 1–4 --------------------------------------------------------------

export function matchMentors(student: StudentProfile, mentors: Mentor[]): MatchResult[] {
  const weights = weightsFor(student);

  const results: MatchResult[] = [];
  for (const m of mentors) {
    if (filterReason(student, m)) continue;

    const raw: Record<Factor, number> = {
      field: fieldScore(student, m),
      role: roleScore(student, m),
      company: companyScore(student, m),
      path: pathScore(student, m),
      helpFit: sharedHelp(student, m).length / student.help_wanted.length,
    };
    // Never pad the list with unrelated fields.
    if (raw.field === 0) continue;

    const breakdown = {} as FactorPoints;
    let base = 0;
    for (const f of Object.keys(raw) as Factor[]) {
      breakdown[f] = round2(raw[f] * weights[f]);
      base += raw[f] * weights[f];
    }
    // Step 3: spread the load across mentors.
    const multiplier = 1 - (FAIRNESS_PENALTY * m.requests_this_month) / m.monthly_limit;
    const shared = sharedHelp(student, m);
    results.push({
      mentor: m,
      score: round2(base * multiplier),
      baseScore: round2(base),
      fairnessMultiplier: round2(multiplier),
      weights,
      breakdown,
      matched: matchedFactors(student, m, raw, shared),
      sharedHelp: shared,
    });
  }

  // Step 4: top 3, highest first; ties broken by id so results are deterministic.
  results.sort((a, b) => b.score - a.score || a.mentor.id.localeCompare(b.mentor.id));
  return results.slice(0, MAX_RESULTS);
}

// Fewer than 3 qualify: would a one-time conversation give more results?
export function oneTimeWouldHelp(student: StudentProfile, mentors: Mentor[], current: number): boolean {
  if (student.cadence === "one_time" || current >= MAX_RESULTS) return false;
  const relaxed = { ...student, cadence: "one_time" as const, months: 1 };
  return matchMentors(relaxed, mentors).length > current;
}
