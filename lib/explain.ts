// "Why this match" — template version. The AI version (app/api/explain) is fed
// the same MatchResult, so the sentence and the chips always agree.
import { STAGE_LABELS } from "./labels";
import type { MatchResult, StudentProfile } from "./types";

export function templateExplanation(r: MatchResult, student: StudentProfile): string {
  const m = r.mentor;
  const bits = r.matched
    .filter((c) => c.key !== "stage")
    .map((c) => c.detail);
  const stage = STAGE_LABELS[student.stage].toLowerCase();
  const lead = bits.length ? `${m.display_name} ${joinList(bits)}` : `${m.display_name} is open to your request`;
  return `${lead}; they welcome students who are ${stage}.`;
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

