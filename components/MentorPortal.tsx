"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { offersLine } from "@/lib/format";
import { CADENCE_LABELS, HELP_LABELS, MEETING_LABELS, STAGE_LABELS, STAGE_DESCRIPTIONS } from "@/lib/labels";
import { validateMentor } from "@/lib/mentorSettings";
import { CADENCES, HELP_TYPES, MEETING_TYPES, STAGES } from "@/lib/types";
import type { MeetingRequest, Mentor } from "@/lib/types";

const toggle = <T,>(list: T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

function Check<T extends string>({ legend, all, value, label, onChange }: {
  legend: string; all: readonly T[]; value: T[]; label: (v: T) => string; onChange: (v: T[]) => void;
}) {
  return (
    <fieldset>
      <legend className="label">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {all.map((v) => (
          <button type="button" key={v} className="choice" aria-pressed={value.includes(v)} onClick={() => onChange(toggle(value, v))}>{label(v)}</button>
        ))}
      </div>
    </fieldset>
  );
}

export default function MentorPortal({ id, onChanged }: { id: string; onChanged: () => void }) {
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [draft, setDraft] = useState<Mentor | null>(null);
  const [requests, setRequests] = useState<MeetingRequest[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const load = useCallback(async () => {
    try {
      const d = await api<{ mentor: Mentor; requests: MeetingRequest[] }>(`/api/mentor/${id}`);
      setMentor(d.mentor); setDraft(d.mentor); setRequests(d.requests);
    } catch (e) { setLoadError((e as Error).message); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function patch(body: Partial<Mentor>, okMsg: string) {
    setErrors([]); setNotice("");
    try {
      await api(`/api/mentor/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      setNotice(okMsg); await load(); onChanged();
    } catch (e) { setErrors([(e as Error).message]); }
  }

  async function save() {
    if (!draft) return;
    const errs = validateMentor(draft);
    if (errs.length) { setErrors(errs); setNotice(""); return; }
    await patch({
      stages: draft.stages, help_types: draft.help_types, can_speak_to: draft.can_speak_to,
      meeting_types: draft.meeting_types, group_size_max: draft.group_size_max,
      cadence_options: draft.cadence_options, max_engagement_months: draft.max_engagement_months,
      meeting_length_minutes: draft.meeting_length_minutes, monthly_limit: draft.monthly_limit,
    }, "Saved. Matching uses these settings right away.");
  }

  async function act(rid: string, action: "accept" | "decline") {
    setErrors([]); setNotice("");
    try { await api(`/api/mentor/${id}/requests/${rid}`, { method: "POST", body: JSON.stringify({ action }) }); await load(); }
    catch (e) { setErrors([(e as Error).message]); }
  }
  async function merge() {
    setErrors([]); setNotice("");
    try { await api(`/api/mentor/${id}/merge`, { method: "POST", body: JSON.stringify({ ids: selected }) }); setSelected([]); setNotice("Merged into one group session."); await load(); }
    catch (e) { setErrors([(e as Error).message]); }
  }
  async function remove() {
    try { await api(`/api/mentor/${id}`, { method: "DELETE" }); setConfirmRemove(false); await load(); onChanged(); }
    catch (e) { setErrors([(e as Error).message]); }
  }
  async function restore() {
    try { await api(`/api/mentor/${id}/restore`, { method: "POST" }); await load(); onChanged(); }
    catch (e) { setErrors([(e as Error).message]); }
  }

  if (loadError) return <p role="alert" className="font-semibold text-danger">{loadError}</p>;
  if (!mentor || !draft) return <div className="skeleton h-40 w-full" aria-busy="true" />;

  const paused = mentor.status === "paused";
  const left = mentor.monthly_limit - mentor.requests_this_month;
  const set = (p: Partial<Mentor>) => setDraft({ ...draft, ...p });
  const pending = requests.filter((r) => r.status === "pending");
  const mergeable = pending.filter((r) => r.meeting_type === "group" && r.student_profile.open_to_group_with_others && !r.merge_group_id);

  if (!mentor.opted_in) return (
    <div className="card space-y-3">
      <h2 className="text-lg">{mentor.display_name}&apos;s profile was removed</h2>
      <p>This profile no longer appears in matching. (Demo: you can bring it back.)</p>
      <button className="btn" onClick={restore}>Restore profile</button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl">{mentor.display_name}</h2>
        <p className="text-sm text-muted">{mentor.role} · {mentor.company}</p>
      </div>

      {notice && <p role="status" className="callout text-sm font-medium">{notice}</p>}
      {errors.length > 0 && (
        <div role="alert" className="card !border-danger">
          <ul className="list-disc pl-5 text-sm font-medium text-danger">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}

      <section className="card space-y-3 !p-5" aria-labelledby="cap">
        <h3 id="cap" className="text-base">Capacity and visibility</h3>
        <p>This month: <strong>{mentor.requests_this_month} of {mentor.monthly_limit}</strong> sessions used ({Math.max(left, 0)} left).</p>
        <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
          <input type="checkbox" className="size-5 accent-[#34696a]" checked={paused} onChange={(e) => patch({ status: e.target.checked ? "paused" : "active" }, e.target.checked ? "Paused. You won't appear in matching or get new requests." : "You're visible in matching again.")} />
          Pause my profile
        </label>
        {paused && <p className="hint">Paused: students can&apos;t find you and no new requests arrive.</p>}
        {!confirmRemove ? (
          <button className="btn btn-danger" onClick={() => setConfirmRemove(true)}>Remove my profile</button>
        ) : (
          <div className="space-y-2 rounded-xl border-2 border-danger p-3" role="alertdialog" aria-label="Confirm removal">
            <p className="font-semibold">Remove your profile? You will disappear from matching and pending requests will be declined.</p>
            <div className="flex gap-2">
              <button className="btn btn-danger" onClick={remove}>Yes, remove it</button>
              <button className="btn btn-secondary" onClick={() => setConfirmRemove(false)}>Keep my profile</button>
            </div>
          </div>
        )}
      </section>

      <section className="card space-y-5 !p-5" aria-labelledby="set">
        <h3 id="set" className="text-base">What I offer</h3>
        <Check legend="Stages I want to help with" all={STAGES} value={draft.stages} label={(s) => STAGE_LABELS[s]} onChange={(stages) => set({ stages })} />
        <p className="hint -mt-3">{draft.stages.map((s) => `${STAGE_LABELS[s]}: ${STAGE_DESCRIPTIONS[s].toLowerCase()}`).join(" · ")}</p>
        <Check legend="Help I offer" all={HELP_TYPES} value={draft.help_types} label={(h) => HELP_LABELS[h]} onChange={(help_types) => set({ help_types })} />
        <div>
          <label htmlFor="speak" className="label">Topics I can speak to <span className="hint font-normal">(comma separated)</span></label>
          <input id="speak" className="input" value={draft.can_speak_to.join(", ")} onChange={(e) => set({ can_speak_to: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} />
        </div>
        <Check legend="Meeting types" all={MEETING_TYPES} value={draft.meeting_types} label={(m) => MEETING_LABELS[m]} onChange={(meeting_types) => set({ meeting_types, group_size_max: meeting_types.includes("group") ? (draft.group_size_max ?? 4) : null })} />
        {draft.meeting_types.includes("group") && (
          <div>
            <label htmlFor="gmax" className="label">Largest group I&apos;ll host</label>
            <select id="gmax" className="input max-w-40" value={draft.group_size_max ?? 4} onChange={(e) => set({ group_size_max: Number(e.target.value) })}>
              {[2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n}>{n}</option>)}
            </select>
          </div>
        )}
        <Check legend="Schedules I offer" all={CADENCES} value={draft.cadence_options} label={(c) => CADENCE_LABELS[c]} onChange={(cadence_options) => set({ cadence_options })} />
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="months" className="label">Longest plan</label>
            <select id="months" className="input" value={draft.max_engagement_months} onChange={(e) => set({ max_engagement_months: Number(e.target.value) })}>
              {[1, 2, 3].map((n) => <option key={n} value={n}>{n} {n === 1 ? "month" : "months"}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="len" className="label">Session length</label>
            <select id="len" className="input" value={draft.meeting_length_minutes} onChange={(e) => set({ meeting_length_minutes: Number(e.target.value) })}>
              {[20, 30, 45].map((n) => <option key={n} value={n}>{n} minutes</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="limit" className="label">Sessions per month</label>
            <input id="limit" type="number" min={1} className="input" value={draft.monthly_limit} onChange={(e) => set({ monthly_limit: Number(e.target.value) })} />
          </div>
        </div>
        <button className="btn" onClick={save}>Save changes</button>
      </section>

      <section className="card space-y-2 !p-5" aria-labelledby="prev">
        <h3 id="prev" className="text-base">What students see</h3>
        <p className="hint">A preview of your public card. Contact details are never shown.</p>
        <div className="rounded-xl border border-line p-4">
          <p className="font-medium">{mentor.display_name}</p>
          <p className="text-sm text-muted">{mentor.role} at {mentor.company} · {mentor.years_experience} years of experience</p>
          <p className="mt-2 text-sm"><strong>Can speak to:</strong> {mentor.can_speak_to.join(", ") || "—"}</p>
          <p className="text-sm"><strong>Offers:</strong> {mentor.help_types.map((h) => HELP_LABELS[h]).join(", ")}</p>
          <p className="text-sm">{offersLine(mentor)}</p>
          <p className="text-sm text-muted">Sessions left this month: {Math.max(left, 0)} of {mentor.monthly_limit}</p>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="inc">
        <h3 id="inc" className="text-base">Incoming requests</h3>
        {requests.length === 0 && <p className="card text-muted">No requests yet. When a student sends one, it will show up here.</p>}
        {mergeable.length >= 2 && (
          <div className="callout flex flex-wrap items-center gap-3">
            <p className="text-sm">Several students are open to being grouped. Select group requests below, then merge them into one session (up to {mentor.group_size_max} people).</p>
            <button className="btn" disabled={selected.length < 2} onClick={merge}>Merge selected ({selected.length})</button>
          </div>
        )}
        {requests.map((r) => {
          const isMergeable = mergeable.some((m) => m.id === r.id);
          return (
            <article key={r.id} className="card space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{MEETING_LABELS[r.meeting_type]}{r.meeting_type === "group" ? ` · ${r.group_size} people` : ""} · {CADENCE_LABELS[r.cadence]}{r.cadence !== "one_time" ? ` for ${r.months} mo` : ""}</p>
                <span className={`chip ${r.status === "pending" ? "chip-warn" : r.status === "accepted" ? "chip-ok" : "chip-bad"}`}>{r.status}{r.merge_group_id ? " · merged group" : ""}</span>
              </div>
              <p className="text-sm"><span className="text-muted">From </span><strong>{r.student_name ?? "Name not provided"}</strong></p>
              <p className="whitespace-pre-wrap rounded-lg bg-surface p-3 text-sm">{r.message}</p>
              {r.status === "pending" && (
                <div className="flex flex-wrap items-center gap-2">
                  <button className="btn" onClick={() => act(r.id, "accept")}>Accept</button>
                  <button className="btn btn-secondary" onClick={() => act(r.id, "decline")}>Decline</button>
                  {isMergeable && (
                    <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
                      <input type="checkbox" className="size-5 accent-[#34696a]" checked={selected.includes(r.id)} onChange={() => setSelected(toggle(selected, r.id))} />
                      Select to merge
                    </label>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
