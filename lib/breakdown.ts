// Plain-language reading of a score breakdown. Display only: it reads the
// points the matcher already produced and never changes them.
import type { Factor, FactorPoints } from "./types";

const ORDER: Factor[] = ["field", "role", "company", "path", "helpFit"];
const NAMES: Record<Factor, string> = {
  field: "field", role: "role", company: "company", path: "path", helpFit: "help type",
};
// What to say when a factor earned (almost) nothing.
const MISSING: Record<Factor, string> = {
  field: "Not in your field.",
  role: "Not in your target role.",
  company: "Not at your target company.",
  path: "No overlap with your path.",
  helpFit: "Doesn't offer the help you asked for.",
};

const STRONG = 0.75;
const PARTIAL = 0.35;

function list(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function summarizeBreakdown(breakdown: FactorPoints, weights: FactorPoints): string {
  const strong: string[] = [];
  const partial: string[] = [];
  const missing: string[] = [];
  for (const f of ORDER) {
    if (weights[f] <= 0) continue; // student left it blank, so it isn't scored
    const share = breakdown[f] / weights[f];
    if (share >= STRONG) strong.push(NAMES[f]);
    else if (share >= PARTIAL) partial.push(NAMES[f]);
    else missing.push(MISSING[f]);
  }
  const parts: string[] = [];
  if (strong.length) parts.push(`Strong match on ${list(strong)}.`);
  if (partial.length) parts.push(`Partial match on ${list(partial)}.`);
  parts.push(...missing);
  return parts.join(" ");
}
