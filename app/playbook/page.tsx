"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import CopyButton from "@/components/CopyButton";
import Icon from "@/components/Icon";
import RequestForm from "@/components/RequestForm";
import { api, getPlaybookMentor, loadProfile } from "@/lib/client";
import { CADENCE_LABELS, STAGE_LABELS } from "@/lib/labels";
import { buildPlaybook, isGroup, isRecurring, type Playbook } from "@/lib/playbook";
import type { Mentor, StudentProfile } from "@/lib/types";

type PublicMentor = Omit<Mentor, "owner_user">;

export default function PlaybookPage() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [mentor, setMentor] = useState<PublicMentor | null>(null);
  const [pb, setPb] = useState<Playbook | null>(null);
  const [draft, setDraft] = useState("");
  const [sessionDrafts, setSessionDrafts] = useState<string[]>([]);
  const [aiState, setAiState] = useState<"loading" | "ai" | "template">("loading");
  const [regen, setRegen] = useState(false);
  const [error, setError] = useState("");
  const variant = useRef(0);

  function apply(p: Playbook) {
    setPb(p);
    setDraft(p.followUp);
    setSessionDrafts(p.sessionPlan?.map((s) => s.followUp) ?? []);
  }

  useEffect(() => {
    const p = loadProfile();
    const id = getPlaybookMentor();
    if (!p || !id) { setError("Start from your matches to open a playbook."); return; }
    setProfile(p);
    api<{ mentor: PublicMentor }>(`/api/mentors/${id}`)
      .then(({ mentor }) => {
        setMentor(mentor);
        apply(buildPlaybook(p, mentor)); // template first, so the page is never empty
        return api<{ playbook: Playbook; source: "ai" | "template" }>("/api/playbook", {
          method: "POST", body: JSON.stringify({ profile: p, mentorId: id }),
        });
      })
      .then((r) => { apply(r.playbook); setAiState(r.source); })
      .catch((e: Error) => { setAiState("template"); setMentor((m) => { if (!m) setError(e.message); return m; }); });
  }, []);

  async function regenerate() {
    if (!profile || !mentor) return;
    variant.current += 1;
    setRegen(true);
    try {
      const r = await api<{ playbook: Playbook }>("/api/playbook", {
        method: "POST", body: JSON.stringify({ profile, mentorId: mentor.id, variant: variant.current }),
      });
      setDraft(r.playbook.followUp);
    } catch {
      setDraft(buildPlaybook(profile, mentor, variant.current).followUp); // template fallback
    } finally { setRegen(false); }
  }

  if (error) return (
    <div className="wrap wrap-sm"><div className="card space-y-3"><p role="alert" className="font-semibold text-danger">{error}</p><Link className="btn" href="/find">Find a mentor</Link></div></div>
  );
  if (!profile || !mentor || !pb) return <div className="wrap wrap-sm space-y-3" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-28 w-full" />)}</div>;

  const group = isGroup(profile);
  // Section numbers depend on which sections this meeting choice includes.
  let n = 0;
  const num = () => <span className="step-badge" aria-hidden="true">{++n}</span>;
  return (
    <div className="wrap wrap-sm space-y-5">
      <div className="space-y-2">
        <p className="eyebrow">Conversation playbook</p>
        <h1 className="text-3xl">{mentor.display_name}</h1>
        <p className="text-[13px] text-muted">{mentor.role} · {mentor.company}</p>
        <ul className="flex flex-wrap gap-1.5" aria-label="Your plan">
          <li className="chip !bg-white !border-line !text-foreground">{STAGE_LABELS[profile.stage]}</li>
          <li className="chip !bg-white !border-line !text-foreground">{group ? `Small group of ${profile.group_size}` : "Just me"}</li>
          <li className="chip !bg-white !border-line !text-foreground">{CADENCE_LABELS[profile.cadence]}{isRecurring(profile) ? ` · ${profile.months} month${profile.months > 1 ? "s" : ""}` : ""}</li>
        </ul>
      </div>

      <p className="callout text-[13px]">
        <strong>We prepare. You decide and you send every message yourself.</strong>{" "}
        <span className="text-muted">Nothing here is sent anywhere. There is no send button on this page, only the meeting request at the bottom, which you press yourself.</span>
      </p>
      <p className="flex items-center gap-1.5 text-xs text-muted" role="status">
        <Icon name="sparkles" size={12} className="text-accent" />
        {aiState === "loading" ? "Personalizing with AI… this plan is ready to use now." : aiState === "ai" ? "Tailored by AI from the mentor's profile and your answers." : "Showing our standard plan. AI personalization wasn't available."}
      </p>

      <section className="space-y-2" aria-labelledby="pb-goal">
        <h2 id="pb-goal" className="flex items-center gap-2 text-[15px]">{num()}Goal for the conversation</h2>
        <p className="card !p-3.5 text-sm">{pb.goal}</p>
      </section>

      <section className="space-y-2" aria-labelledby="pb-q">
        <h2 id="pb-q" className="flex items-center gap-2 text-[15px]">{num()}Questions worth asking{group ? " (as a group)" : ""}</h2>
        <ol className="space-y-2">{pb.questions.map((q) => <li key={q} className="card !p-3.5 text-sm font-medium">{q}</li>)}</ol>
      </section>

      <section className="space-y-2" aria-labelledby="pb-avoid">
        <h2 id="pb-avoid" className="flex items-center gap-2 text-[15px]">{num()}What to avoid <Icon name="ban" size={14} className="text-muted" /></h2>
        <ul className="card !p-3.5 space-y-1.5 text-[13px]">
          {pb.avoid.map((a) => <li key={a} className="flex items-start gap-2"><span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-danger" />{a}</li>)}
        </ul>
      </section>

      {group && pb.groupEtiquette && (
        <section className="space-y-2" aria-labelledby="pb-group">
          <h2 id="pb-group" className="flex items-center gap-2 text-[15px]">{num()}Group etiquette</h2>
          <ul className="card !p-3.5 space-y-1.5 text-[13px]">
            {pb.groupEtiquette.map((t) => <li key={t} className="flex items-start gap-2"><span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />{t}</li>)}
          </ul>
        </section>
      )}

      {isRecurring(profile) && pb.sessionPlan && (
        <section className="space-y-2" aria-labelledby="pb-plan">
          <h2 id="pb-plan" className="flex items-center gap-2 text-[15px]">{num()}Session plan</h2>
          <p className="hint">One goal per session across your {profile.months} month plan, with a draft to send after each one.</p>
          {pb.sessionPlan.map((s, i) => (
            <div key={s.session} className="card !p-3.5 space-y-2">
              <h3 className="flex items-center gap-2 text-[13px]"><Icon name="calendar" size={14} className="text-muted" />Session {s.session}</h3>
              <p className="text-sm">{s.goal}</p>
              {s.between && <p className="text-[13px]"><strong className="font-medium">Between sessions:</strong> <span className="text-muted">{s.between}</span></p>}
              <details>
                <summary className="btn-link cursor-pointer list-none">Follow-up draft for this session</summary>
                <div className="space-y-2 pt-2">
                  <label className="label sr-only" htmlFor={`fu-${i}`}>Follow-up draft for session {s.session}</label>
                  <textarea id={`fu-${i}`} className="input min-h-32" value={sessionDrafts[i] ?? ""} onChange={(e) => setSessionDrafts((d) => d.map((x, j) => (j === i ? e.target.value : x)))} />
                  <CopyButton text={sessionDrafts[i] ?? ""} />
                </div>
              </details>
            </div>
          ))}
        </section>
      )}

      <section className="space-y-2" aria-labelledby="pb-fu">
        <h2 id="pb-fu" className="flex items-center gap-2 text-[15px]">{num()}{isRecurring(profile) ? "Follow-up after the last session" : "Follow-up after the conversation"}</h2>
        <div className="card !p-3.5 space-y-2.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <label className="label !mb-0" htmlFor="draft">Follow-up message draft</label>
            <span className="hint">Placeholders in [brackets]. Edit anything before you send it.</span>
          </div>
          <textarea id="draft" className="input min-h-40" value={draft} onChange={(e) => setDraft(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <CopyButton text={draft} />
            <button type="button" className="btn btn-secondary" onClick={regenerate} disabled={regen}><Icon name="refresh" size={14} />{regen ? "Regenerating…" : "Regenerate draft"}</button>
          </div>
        </div>
      </section>

      <RequestForm profile={profile} mentor={mentor} startingText={draft} />
    </div>
  );
}
