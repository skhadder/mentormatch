"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import Icon from "./Icon";
import { addSentRequest, api } from "@/lib/client";
import { CADENCE_LABELS, reservedSessions } from "@/lib/labels";
import type { Mentor, StudentProfile } from "@/lib/types";

// The student reviews the plan, writes their own message, and presses Send.
// Nothing here sends automatically.
export default function RequestForm({
  profile, mentor,
}: { profile: StudentProfile; mentor: Pick<Mentor, "id" | "display_name" | "monthly_limit" | "requests_this_month">}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [studentName, setStudentName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const first = mentor.display_name.trim().split(/\s+/)[0];
  const total = reservedSessions(profile.cadence, profile.months);
  const left = mentor.monthly_limit - mentor.requests_this_month;
  const schedule = profile.cadence === "one_time" ? CADENCE_LABELS.one_time : `${CADENCE_LABELS[profile.cadence]} for ${profile.months} month${profile.months > 1 ? "s" : ""}`;
  const meeting = profile.meeting_type === "group" ? `Small group of ${profile.group_size}${profile.open_to_group_with_others ? " (open to being grouped)" : ""}` : "Just me";

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await api<{ request: { id: string } }>("/api/requests", {
        method: "POST", body: JSON.stringify({ profile, mentorId: mentor.id, message, studentName }),
      });
      addSentRequest(r.request.id);
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally { setBusy(false); }
  }

  return (
    <>
      <section className="card space-y-2 !p-5" aria-labelledby="ready">
        <h2 id="ready" className="text-base">{sent ? "Request sent" : "Ready? Send the request yourself."}</h2>
        <p className="text-[13px] text-muted">
          {sent
            ? `${mentor.display_name} will see your request and can accept or decline. It shows as Pending until they answer.`
            : "The mentor sees your message, your stage and what you asked for. Sessions are held for you until they accept or decline."}
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {sent ? (
            <Link href="/requests" className="btn">See my requests <Icon name="arrow-right" size={15} /></Link>
          ) : (
            <button type="button" className="btn" onClick={() => dialog.current?.showModal()}>Request a meeting <Icon name="arrow-right" size={15} /></button>
          )}
          <Link href="/results" className="btn-link !text-foreground">Compare other matches</Link>
        </div>
      </section>

      <dialog
        ref={dialog}
        aria-labelledby="req-h"
        className="m-auto w-[min(92vw,30rem)] rounded-2xl border border-line bg-background p-0 text-foreground backdrop:bg-black/50"
      >
        <form onSubmit={send} className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="req-h" className="text-lg">Request a meeting with {first}</h2>
              <p className="mt-1 text-[13px] text-muted">This is the only thing the app sends, and only when you press Send request. Nothing is auto-sent.</p>
            </div>
            <button type="button" aria-label="Close" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-surface" onClick={() => dialog.current?.close()}>
              <Icon name="x" size={16} />
            </button>
          </div>

          <dl className="panel divide-y divide-line !p-0 text-[13px]">
            {[["Meeting", meeting], ["Schedule", schedule], ["Sessions", `This request reserves ${total} session${total === 1 ? "" : "s"}. ${first} has ${Math.max(left, 0)} left this month.`]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-3 py-2.5"><dt className="text-muted">{k}</dt><dd className="text-right">{v}</dd></div>
            ))}
          </dl>

          {sent ? (
            <p role="status" className="callout text-sm font-medium">Request sent. You can close this window.</p>
          ) : (
            <>
              <div>
                <label htmlFor="student-name" className="label">Your first and last name</label>
                <input id="student-name" className="input" value={studentName} onChange={(e) => setStudentName(e.target.value)} autoComplete="name" maxLength={80} required />
                <p className="hint mt-1.5">{first} sees this with your request so they know who is asking.</p>
              </div>
              <div>
                <label htmlFor="msg" className="label">Your message</label>
                <textarea id="msg" className="input min-h-36" value={message} onChange={(e) => setMessage(e.target.value)} placeholder={`Write a short note to ${first} in your own words: who you are, what you hope to learn, and why you picked them.`} />
                <p className="hint mt-1.5">The mentor reads exactly what you write. They never see your contact details.</p>
              </div>
              {error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}
              <div className="flex items-center gap-2">
                <button type="submit" className="btn" disabled={busy || !message.trim() || !studentName.trim()}>{busy ? "Sending…" : "Send request"}</button>
                <button type="button" className="btn-link !text-foreground !px-3" onClick={() => dialog.current?.close()}>Cancel</button>
              </div>
            </>
          )}
        </form>
      </dialog>
    </>
  );
}
