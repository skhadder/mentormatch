"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { api, loadProfile, saveProfile } from "@/lib/client";
import { CADENCE_LABELS, HELP_LABELS, STAGE_DESCRIPTIONS, STAGE_LABELS } from "@/lib/labels";
import { CADENCES, HELP_TYPES, STAGES } from "@/lib/types";
import type { StudentProfile } from "@/lib/types";

const EMPTY: StudentProfile = {
  field: "", stage: "" as never, target_role: "", target_company: "", help_wanted: [],
  meeting_type: "one_on_one", group_size: 3, open_to_group_with_others: false,
  cadence: "one_time", months: 1, major: "",
};

export default function Intake() {
  const router = useRouter();
  const [p, setP] = useState<StudentProfile>(EMPTY);
  const [fields, setFields] = useState<string[]>([]);
  const [error, setError] = useState("");
  const set = (patch: Partial<StudentProfile>) => setP((x) => ({ ...x, ...patch }));

  useEffect(() => {
    // Restore earlier answers ("Edit answers") and load the field list.
    const saved = loadProfile();
    if (saved) setP({ ...EMPTY, ...saved });
    api<{ fields: string[] }>("/api/fields").then((d) => setFields(d.fields)).catch(() => setError("We couldn't load the list of fields. Please refresh."));
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!p.field) return setError("Please choose a field of interest.");
    if (!p.stage) return setError("Please choose where you are right now.");
    if (p.help_wanted.length === 0) return setError("Please choose at least one kind of help.");
    setError("");
    saveProfile(p);
    router.push("/results");
  }

  const toggleHelp = (h: StudentProfile["help_wanted"][number]) =>
    set({ help_wanted: p.help_wanted.includes(h) ? p.help_wanted.filter((x) => x !== h) : [...p.help_wanted, h] });

  return (
    <form onSubmit={submit} className="wrap wrap-sm space-y-4" noValidate>
      <div className="space-y-2 pb-2">
        <p className="eyebrow">Find a mentor</p>
        <h1 className="text-3xl">Tell us what you need</h1>
        <p className="text-sm text-muted">Six quick questions. We score every mentor who has opted in, and show you the top three with the reasons.</p>
      </div>

      <section className="card space-y-3">
        <h2 className="text-[15px]"><span className="text-muted">1.</span> What field interests you?</h2>
        <div>
          <label htmlFor="field" className="label">Field of interest</label>
          <select id="field" className="input" value={p.field} onChange={(e) => set({ field: e.target.value })} required>
            <option value="">Choose a field…</option>
            {fields.map((f) => <option key={f}>{f}</option>)}
          </select>
          <p className="hint mt-1.5">This list is built from the fields of the mentors currently in the pool.</p>
        </div>
      </section>

      <fieldset className="card space-y-3">
        <legend className="sr-only">Where are you right now?</legend>
        <div>
          <h2 className="text-[15px]" aria-hidden="true"><span className="text-muted">2.</span> Where are you right now?</h2>
          <p className="hint mt-1">Your stage decides how much weight field, role and company get.</p>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="Career stage">
          {STAGES.map((s) => (
            <button type="button" key={s} role="radio" aria-checked={p.stage === s} onClick={() => set({ stage: s })} className="opt flex items-start justify-between gap-3">
              <span>
                <span className="block text-sm font-semibold">{STAGE_LABELS[s]}</span>
                <span className="text-xs text-muted">{STAGE_DESCRIPTIONS[s]}</span>
              </span>
              <span aria-hidden="true" className={`mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border ${p.stage === s ? "border-accent bg-accent text-white" : "border-line"}`}>
                {p.stage === s && <Icon name="check" size={12} />}
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      <section className="card space-y-3">
        <div>
          <h2 className="text-[15px]"><span className="text-muted">3.</span> Anything specific you&apos;re aiming at?</h2>
          <p className="hint mt-1">Optional. Leaving these blank spreads their weight across the other factors.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="role" className="label">Target role</label>
            <input id="role" className="input" value={p.target_role} placeholder="e.g. Product Manager" onChange={(e) => set({ target_role: e.target.value })} />
          </div>
          <div>
            <label htmlFor="company" className="label">Target company</label>
            <input id="company" className="input" value={p.target_company} placeholder="e.g. Spotify" onChange={(e) => set({ target_company: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="major" className="label">Your major or background</label>
            <input id="major" className="input" value={p.major} placeholder="e.g. Psychology" onChange={(e) => set({ major: e.target.value })} />
            <p className="hint mt-1.5">Used only to find mentors with a similar path. Leave it blank and that factor is skipped.</p>
          </div>
        </div>
      </section>

      <fieldset className="card space-y-3">
        <legend className="sr-only">What help do you want?</legend>
        <div>
          <h2 className="text-[15px]" aria-hidden="true"><span className="text-muted">4.</span> What help do you want?</h2>
          <p className="hint mt-1">Choose at least one.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {HELP_TYPES.map((h) => (
            <button type="button" key={h} className="choice" aria-pressed={p.help_wanted.includes(h)} onClick={() => toggleHelp(h)}>
              {HELP_LABELS[h]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="card space-y-3">
        <legend className="sr-only">How would you like to meet?</legend>
        <h2 className="text-[15px]" aria-hidden="true"><span className="text-muted">5.</span> How would you like to meet?</h2>
        <div className="grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="Meeting type">
          <button type="button" role="radio" aria-checked={p.meeting_type === "one_on_one"} className="opt" onClick={() => set({ meeting_type: "one_on_one" })}>
            <span className="block text-sm font-semibold">Just me</span><span className="text-xs text-muted">One-on-one conversation</span>
          </button>
          <button type="button" role="radio" aria-checked={p.meeting_type === "group"} className="opt" onClick={() => set({ meeting_type: "group" })}>
            <span className="block text-sm font-semibold">Small group</span><span className="text-xs text-muted">Learn alongside other students</span>
          </button>
        </div>
        {p.meeting_type === "group" && (
          <div className="space-y-3 rounded-xl bg-surface p-3">
            <div>
              <label htmlFor="gs" className="label">Group size <span className="hint font-normal">(including you)</span></label>
              <select id="gs" className="input max-w-40" value={p.group_size} onChange={(e) => set({ group_size: Number(e.target.value) })}>
                {[2, 3, 4, 5, 6].map((n) => <option key={n}>{n}</option>)}
              </select>
            </div>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input type="checkbox" className="size-5 accent-[#34696a]" checked={p.open_to_group_with_others} onChange={(e) => set({ open_to_group_with_others: e.target.checked })} />
              I&apos;m open to being grouped with other students
            </label>
          </div>
        )}
      </fieldset>

      <fieldset className="card space-y-3">
        <legend className="sr-only">How often?</legend>
        <h2 className="text-[15px]" aria-hidden="true"><span className="text-muted">6.</span> How often?</h2>
        <div className="grid gap-2.5 sm:grid-cols-4" role="radiogroup" aria-label="Schedule">
          {CADENCES.map((c) => (
            <button type="button" key={c} role="radio" aria-checked={p.cadence === c} className="opt !text-[13px]" onClick={() => set({ cadence: c, months: c === "one_time" ? 1 : p.months })}>
              {CADENCE_LABELS[c]}
            </button>
          ))}
        </div>
        {p.cadence !== "one_time" && (
          <div className="max-w-56 rounded-xl bg-surface p-3">
            <label htmlFor="months" className="label">For how many months?</label>
            <select id="months" className="input" value={p.months} onChange={(e) => set({ months: Number(e.target.value) })}>
              {[1, 2, 3].map((n) => <option key={n} value={n}>{n} {n === 1 ? "month" : "months"}</option>)}
            </select>
          </div>
        )}
      </fieldset>

      <p className="panel flex items-center gap-2 text-xs text-muted">
        <Icon name="info" size={14} />We only use these answers to find mentors. No name, photo, or personal details are used in matching.
      </p>

      {error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}
      <button type="submit" className="btn w-full sm:w-auto">See my top 3 mentors <Icon name="arrow-right" /></button>
    </form>
  );
}
