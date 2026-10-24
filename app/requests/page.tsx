"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { api, getSentRequests } from "@/lib/client";
import { CADENCE_LABELS, MEETING_LABELS } from "@/lib/labels";
import type { Cadence, MeetingType, RequestStatus } from "@/lib/types";

interface Row {
  id: string; status: RequestStatus; created_at: string; meeting_type: MeetingType; cadence: Cadence; months: number;
  mentor: { display_name: string; role: string; company: string } | null;
}

const STATUS: Record<RequestStatus, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "chip-warn" },
  accepted: { label: "Accepted", cls: "chip-ok" },
  declined: { label: "Declined", cls: "chip-bad" },
};

const sent = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function Requests() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const ids = getSentRequests();
    if (ids.length === 0) { setRows([]); return; }
    api<{ requests: Row[] }>("/api/requests/lookup", { method: "POST", body: JSON.stringify({ ids }) })
      .then((d) => setRows(d.requests.sort((a, b) => b.created_at.localeCompare(a.created_at))))
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div className="wrap wrap-md space-y-5">
      <div className="space-y-2">
        <p className="eyebrow">Your side</p>
        <h1 className="text-3xl">My requests</h1>
        <p className="max-w-xl text-sm text-muted">
          Every request you sent from this browser, and where it stands. Mentors reply by accepting or declining; their contact details are never shown here.
        </p>
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}
      {rows === null && !error && <div className="skeleton h-24 w-full" />}
      {rows?.length === 0 && (
        <div className="card space-y-3"><p className="text-sm">You haven&apos;t sent any requests yet.</p><Link href="/find" className="btn">Find a mentor <Icon name="arrow-right" size={15} /></Link></div>
      )}
      {rows?.map((r) => (
        <article key={r.id} className="card space-y-1.5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-base">{r.mentor?.display_name ?? "Mentor no longer available"}</h2>
            <span className={`chip ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</span>
          </div>
          <p className="text-[13px] text-muted">
            {r.mentor ? `${r.mentor.role} · ${r.mentor.company} · ` : ""}{MEETING_LABELS[r.meeting_type] === "One-on-one" ? "Just me" : "Small group"} · {CADENCE_LABELS[r.cadence]}{r.cadence !== "one_time" ? ` for ${r.months} month${r.months > 1 ? "s" : ""}` : ""}
          </p>
          <p className="text-xs text-muted">Sent {sent(r.created_at)}</p>
        </article>
      ))}
    </div>
  );
}
