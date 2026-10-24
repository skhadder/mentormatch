"use client";

import { useState } from "react";
import Icon from "./Icon";
import { offersLine } from "@/lib/format";
import { HELP_LABELS } from "@/lib/labels";
import type { Factor, FactorPoints, MatchedFactor, Mentor } from "@/lib/types";

export interface ResultView {
  mentor: Omit<Mentor, "owner_user">;
  score: number;
  baseScore: number;
  fairnessMultiplier: number;
  weights: FactorPoints;
  breakdown: FactorPoints;
  matched: MatchedFactor[];
  explanation: string;
}

const FACTOR_LABELS: Record<Factor, string> = {
  field: "Field", role: "Role", company: "Company", path: "Path overlap", helpFit: "Help fit",
};

export default function MentorCard({
  r, aiPending, onPrepare,
}: { r: ResultView; rank?: number; aiPending: boolean; onPrepare: () => void }) {
  const [open, setOpen] = useState(false);
  const m = r.mentor;
  const left = m.monthly_limit - m.requests_this_month;
  return (
    <article className="card space-y-3.5" aria-labelledby={`m-${m.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id={`m-${m.id}`} className="text-lg">{m.display_name}</h2>
          <p className="text-[13px] text-muted">{m.role} · {m.company}</p>
          <p className="text-xs text-muted">{m.years_experience} years in {m.field} · synthetic demo profile</p>
        </div>
        <span className="chip !min-h-7 shrink-0 !text-[13px]" aria-label={`Match score ${r.score}`}>Match {r.score}</span>
      </div>

      <div className="text-sm">
        <span className="font-semibold">Why this match: </span>
        {aiPending ? <span className="skeleton inline-block h-4 w-2/3 align-middle" aria-label="Improving explanation" /> : null}
        <span className={aiPending ? "sr-only" : ""}>{r.explanation}</span>
      </div>

      <ul className="flex flex-wrap gap-1.5" aria-label="What matched">
        {r.matched.map((c) => <li key={c.key} className="chip">{c.label}</li>)}
      </ul>

      <div className="space-y-1 border-t border-line pt-3 text-xs text-muted">
        <p>{offersLine(m)} · {m.meeting_length_minutes} min</p>
        <p>Sessions left this month: {left} of {m.monthly_limit}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="btn btn-secondary" aria-expanded={open} onClick={() => setOpen(!open)}>
          <Icon name="eye" size={15} />{open ? "Hide details" : "See details"}
        </button>
        <button className="btn" onClick={onPrepare}>Prepare to meet <Icon name="arrow-right" size={15} /></button>
      </div>

      {open && (
        <div className="space-y-4 border-t border-line pt-4 text-sm">
          <p>{m.bio_for_explanations}</p>
          <div><strong>Can speak to:</strong> {m.can_speak_to.join(", ")}</div>
          <div><strong>Offers:</strong> {m.help_types.map((h) => HELP_LABELS[h]).join(", ")}</div>
          {m.not_open_to.length > 0 && <div><strong>Not open to:</strong> {m.not_open_to.join("; ")}</div>}
          <div><strong>Meets by:</strong> {m.meeting_channel.replace("_", " ")} · {m.meeting_length_minutes} minutes</div>
          <div>
            <strong>Score breakdown</strong> (total {r.score})
            <table className="mt-2 w-full text-[13px]">
              <thead><tr className="text-left text-muted"><th className="py-1 font-medium">Factor</th><th className="font-medium">Points</th><th className="font-medium">Out of</th></tr></thead>
              <tbody>
                {(Object.keys(FACTOR_LABELS) as Factor[]).map((f) => (
                  <tr key={f} className="border-t border-line"><td className="py-1">{FACTOR_LABELS[f]}</td><td>{r.breakdown[f].toFixed(1)}</td><td>{r.weights[f].toFixed(1)}</td></tr>
                ))}
              </tbody>
            </table>
            <p className="hint mt-2">
              Subtotal {r.baseScore.toFixed(1)} × load-spreading adjustment {r.fairnessMultiplier} = {r.score.toFixed(1)}.
              Mentors with more requests this month are reduced slightly so a few people aren&apos;t overloaded.
            </p>
          </div>
        </div>
      )}
    </article>
  );
}
