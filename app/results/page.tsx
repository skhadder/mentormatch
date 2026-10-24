"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import MentorCard, { type ResultView } from "@/components/MentorCard";
import Icon from "@/components/Icon";
import { api, loadProfile, saveProfile, setPlaybookMentor } from "@/lib/client";
import { searchSummary } from "@/lib/format";
import { HELP_LABELS, STAGE_LABELS } from "@/lib/labels";
import { STAGE_WEIGHTS } from "@/lib/matching";
import type { Factor, StudentProfile } from "@/lib/types";

interface MatchResponse { profile: StudentProfile; results: ResultView[]; oneTimeWouldHelp: boolean }

const FACTOR_NAMES: Record<Factor, string> = { field: "Field", role: "Role", company: "Company", path: "Path overlap", helpFit: "Help fit" };

export default function Results() {
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [data, setData] = useState<MatchResponse | null>(null);
  const [error, setError] = useState("");
  const [aiPending, setAiPending] = useState<Record<string, boolean>>({});

  const run = useCallback(async (p: StudentProfile) => {
    setError("");
    setData(null);
    try {
      const d = await api<MatchResponse>("/api/match", { method: "POST", body: JSON.stringify({ profile: p }) });
      setData(d);
      // Template explanations are already showing. Try to upgrade each with AI,
      // and quietly keep the template if that fails or is slow.
      setAiPending(Object.fromEntries(d.results.map((r) => [r.mentor.id, true])));
      d.results.forEach((r) => {
        api<{ explanation: string }>("/api/explain", { method: "POST", body: JSON.stringify({ profile: d.profile, mentorId: r.mentor.id }) })
          .then(({ explanation }) =>
            setData((cur) => cur && { ...cur, results: cur.results.map((x) => (x.mentor.id === r.mentor.id ? { ...x, explanation } : x)) }))
          .catch(() => {})
          .finally(() => setAiPending((a) => ({ ...a, [r.mentor.id]: false })));
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    const p = loadProfile();
    if (!p) return router.replace("/find");
    setProfile(p);
    run(p);
  }, [router, run]);

  if (!profile) return null;

  const count = data?.results.length ?? 0;
  const w = STAGE_WEIGHTS[profile.stage];

  return (
    <div className="wrap wrap-md space-y-5">
      <section className="flex flex-wrap items-start justify-between gap-3" aria-label="Your search">
        <div className="space-y-2">
          <p className="eyebrow">Your results</p>
          <h1 className="text-3xl">Your top 3 mentors</h1>
          <p className="max-w-lg text-sm text-muted">
            Ranked with plain code against the mentors who opted in. Every card shows the factors that scored, and the same data builds the explanation.
          </p>
        </div>
        <Link href="/find" className="btn btn-secondary"><Icon name="pencil" size={14} />Edit answers</Link>
      </section>

      <dl className="panel grid gap-x-6 gap-y-1 text-[13px] sm:flex sm:flex-wrap">
        {searchSummary(profile).map(([k, v]) => (
          <div key={k} className="flex gap-1.5"><dt className="text-muted">{k}:</dt><dd>{v}</dd></div>
        ))}
      </dl>

      {error && (
        <div role="alert" className="card border-danger">
          <p className="font-semibold text-danger">{error}</p>
          <button className="btn mt-3" onClick={() => run(profile)}>Try again</button>
        </div>
      )}

      {!data && !error && (
        <div className="space-y-3" aria-busy="true" aria-label="Finding mentors">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton h-44 w-full" />)}
        </div>
      )}

      {data && (
        <>
          {count < 3 && count > 0 && (
            <p className="callout text-sm font-medium">
              Only {count} strong match{count > 1 ? "es" : ""} right now.
              {data.oneTimeWouldHelp && <> Only {count} mentor{count > 1 ? "s" : ""} offer{count > 1 ? "" : "s"} this schedule.</>}
            </p>
          )}
          {count === 0 && (
            <div className="card space-y-2">
              <h2 className="text-lg">No strong matches right now</h2>
              <p className="text-sm text-muted">
                {data.oneTimeWouldHelp
                  ? "No mentors offer this schedule right now."
                  : "No mentor fits every one of your answers yet. Try a different kind of help, a one-on-one meeting, or edit your answers."}
              </p>
            </div>
          )}
          {data.oneTimeWouldHelp && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                const p = { ...profile, cadence: "one_time" as const, months: 1 };
                saveProfile(p);
                setProfile(p);
                run(p);
              }}
            >
              Show one-time conversations instead
            </button>
          )}

          <div className="space-y-4">
            {data.results.map((r, i) => (
              <MentorCard
                key={r.mentor.id} r={r} rank={i + 1} aiPending={!!aiPending[r.mentor.id]}
                onPrepare={() => { setPlaybookMentor(r.mentor.id); router.push("/playbook"); }}
              />
            ))}
          </div>

          <details className="group card !p-0">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-medium">
              How we matched you
              <Icon name="chevron" size={16} className="text-muted transition-transform group-open:rotate-180" />
            </summary>
            <div className="space-y-3 border-t border-line p-4 text-sm">
              <p>
                You&apos;re at the <strong>{STAGE_LABELS[profile.stage]}</strong> stage, so points are weighted like this
                (out of 100{!profile.target_role || !profile.target_company || !profile.major ? "; any factor you left blank is skipped and its weight is shared across the rest" : ""}):
              </p>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {(Object.keys(w) as Factor[]).map((f) => (
                  <li key={f} className="rounded-lg border border-line p-2"><span className="block text-xs text-muted">{FACTOR_NAMES[f]}</span><strong>{data.results[0]?.weights[f].toFixed(0) ?? w[f]}</strong></li>
                ))}
              </ul>
              <p>First we remove anyone who is paused, full, or doesn&apos;t offer the help ({profile.help_wanted.map((h) => HELP_LABELS[h]).join(", ")}), meeting type, or schedule you chose. Meeting type and schedule never change a score.</p>
              <p><strong>Never used:</strong> name, gender, ethnicity, age, photos.</p>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
