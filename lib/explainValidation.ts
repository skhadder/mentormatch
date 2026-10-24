// Checks an AI-written "Why this match" sentence before a student sees it.
// Anything that fails falls back to the template sentence.
import { HELP_LABELS, STAGE_LABELS } from "./labels";
import type { MatchResult, StudentProfile } from "./types";

const URL_RE = /https?:\/\/|www\.|\b[a-z0-9-]+\.(com|org|net|io|co|dev|app|ai|edu|gov)\b/i;
const HTML_RE = /<[^>]*>|[<>]|&[a-z#0-9]+;/i;
const SENIORITY = new Set(["associate", "senior", "junior", "staff", "lead", "principal"]);

// Words match loosely by their first five letters, so "engineering" accepts "engineer".
const stem = (w: string) => (w.length >= 6 ? w.slice(0, 5) : w);

function mentions(text: string, term: string): boolean {
  const words = term.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w && !SENIORITY.has(w));
  const have = new Set(text.toLowerCase().split(/[^a-z0-9]+/).map(stem));
  return words.length > 0 && words.every((w) => have.has(stem(w)));
}

// What the sentence may cite for each matched factor, taken from the same data as the chips.
function termsFor(r: MatchResult, student: StudentProfile): string[] {
  const m = r.mentor;
  return r.matched.flatMap((c) => {
    switch (c.key) {
      case "field": return [m.field];
      case "role": return [m.role];
      case "company": return [m.company];
      case "path": return [m.major, ...(m.switched_from_field ? [m.switched_from_field] : [])];
      case "help": return r.sharedHelp.map((h) => HELP_LABELS[h]);
      case "stage": return [STAGE_LABELS[student.stage]];
    }
  });
}

export function validateExplanation(text: unknown, r: MatchResult, student: StudentProfile): text is string {
  if (typeof text !== "string") return false;
  const t = text.trim();
  if (t.length <= 10 || t.length >= 400 || t.includes("\n")) return false;
  if (URL_RE.test(t) || HTML_RE.test(t)) return false;
  return termsFor(r, student).some((term) => mentions(t, term));
}
