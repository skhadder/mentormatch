"use client";

import { useState } from "react";
import Icon from "./Icon";
import { api } from "@/lib/client";
import { meetingSummary } from "@/lib/format";
import { HELP_LABELS, STAGE_LABELS } from "@/lib/labels";
import { FAIRNESS_NAMES, type FairnessReport } from "@/lib/fairness";

export default function FairnessCheck() {
  const [report, setReport] = useState<FairnessReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setBusy(true); setError("");
    try { setReport(await api<FairnessReport>("/api/fairness", { method: "POST" })); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  const p = report?.profile;
  return (
    <section className="card space-y-4 !p-5" aria-labelledby="fc">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-md space-y-1">
          <h2 id="fc" className="text-base">Run the fairness check</h2>
          <p className="text-[13px] text-muted">
            One sample student, ranked five times with different made-up names attached: {FAIRNESS_NAMES.slice(0, -1).join(", ")} and {FAIRNESS_NAMES[FAIRNESS_NAMES.length - 1]}.
            It calls the exact same ranking function the results page uses, not a copy.
          </p>
        </div>
        <button className="btn" onClick={run} disabled={busy}><Icon name="shield" size={14} />{busy ? "Running…" : "Run fairness check"}</button>
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}

      {report && p && (
        <div className="space-y-4" aria-live="polite">
          <div className="panel text-[13px]">
            <p className="font-medium">Sample student</p>
            <p className="mt-1 text-muted">
              {STAGE_LABELS[p.stage]} · {p.field} · aiming at {p.target_role} at {p.target_company} · {p.help_wanted.map((h) => HELP_LABELS[h].toLowerCase()).join(" and ")} · {meetingSummary(p).toLowerCase()}.
            </p>
          </div>
          <p
            role="status"
            className={`rounded-xl border px-4 py-3 text-sm font-semibold ${report.pass ? "border-[var(--warm-line)] bg-[var(--warm-soft)] text-[var(--warm-text)]" : "border-[#f0cdc8] bg-[#fbeeec] text-danger"}`}
          >
            {report.pass ? "PASS: every run returned the same mentors with the same scores." : "FAIL: results changed when only the name changed."}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-muted"><th className="py-2 pr-3 font-medium">Name used</th><th className="pr-3 font-medium">#1</th><th className="pr-3 font-medium">#2</th><th className="font-medium">#3</th></tr>
              </thead>
              <tbody>
                {report.runs.map((r) => (
                  <tr key={r.name} className={`border-b border-line align-top ${r.differs ? "bg-[#fbeeec]" : ""}`}>
                    <th scope="row" className="py-2 pr-3 font-medium">{r.name}{r.differs && <span className="ml-1 text-danger"> (differs)</span>}</th>
                    {[0, 1, 2].map((i) => (
                      <td key={i} className="py-2 pr-3">{r.top[i] ? <>{r.top[i].mentorName}<br /><span className="text-muted">{r.top[i].score.toFixed(2)}</span></> : "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
