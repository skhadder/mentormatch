"use client";

import Icon from "@/components/Icon";
import { useCallback, useEffect, useState } from "react";
import MentorPortal from "@/components/MentorPortal";
import { api, getMentorId, setMentorId } from "@/lib/client";

interface Option { id: string; display_name: string; role: string; company: string; opted_in: boolean }

export default function MentorPage() {
  const [options, setOptions] = useState<Option[]>([]);
  const [id, setId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(() =>
    api<{ mentors: Option[] }>("/api/mentor").then((d) => setOptions(d.mentors)).catch((e: Error) => setError(e.message)), []);

  useEffect(() => { setId(getMentorId()); load(); }, [load]);

  function choose(v: string | null) { setId(v); setMentorId(v); }

  const q = query.trim().toLowerCase();
  const shown = options.filter((o) => !q || `${o.display_name} ${o.role} ${o.company}`.toLowerCase().includes(q));

  return (
    <div className="wrap wrap-md space-y-5">
      {id && (
        <button className="btn-link !pl-0" onClick={() => choose(null)}>
          <Icon name="arrow-right" size={13} className="rotate-180" />Back
        </button>
      )}
      <div className="space-y-2">
        <p className="eyebrow">Mentor portal</p>
        <h1 className="text-3xl">{id ? "Your mentor portal" : "Which profile is you?"}</h1>
        <p className="max-w-xl text-sm text-muted">
          {id
            ? "You only see this profile and the requests sent to it. Changes take effect in matching right away."
            : "This prototype ships with 50 fictional mentors. Pick one to manage: you will only ever see the profile you claim and the requests sent to it. Every profile is labelled synthetic."}
        </p>
      </div>

      <div className="callout !border-[#f3dfc6] !bg-[#fdf5eb] text-[13px]" role="note">
        <strong>Demo only: this is not a real login.</strong> There are no accounts in this prototype, so anyone can view as any fictional mentor.
      </div>

      {error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}

      {id ? (
        <>
          <button className="btn btn-secondary" onClick={() => choose(null)}>Switch profile</button>
          <MentorPortal key={id} id={id} onChanged={load} />
        </>
      ) : (
        <>
          <div>
            <label htmlFor="q" className="sr-only">Search by name, role or company</label>
            <input id="q" type="search" className="input max-w-sm" placeholder="Search by name, role or company" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <ul className="card divide-y divide-line !p-0">
            {shown.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium">{o.display_name}{!o.opted_in && <span className="ml-2 text-xs text-muted">(removed)</span>}</p>
                  <p className="text-xs text-muted">{o.role} · {o.company}</p>
                </div>
                <button className="btn !px-4 !text-[13px]" onClick={() => choose(o.id)} aria-label={`This is me: ${o.display_name}`}>This is me</button>
              </li>
            ))}
            {shown.length === 0 && <li className="px-4 py-6 text-sm text-muted">{options.length ? "No profiles match your search." : "Loading profiles…"}</li>}
          </ul>
        </>
      )}
    </div>
  );
}
