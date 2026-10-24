// Meeting-request rules, as pure functions over an in-memory Db.
// lib/store.ts handles loading and saving the Db to disk.

import { filterReason } from "./matching";
import { reservedSessions, SESSIONS_PER_MONTH } from "./labels";
import type { MeetingRequest, Mentor, StudentProfile } from "./types";

export interface Db {
  mentors: Mentor[];
  requests: MeetingRequest[];
}

export class RuleError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const findMentor = (db: Db, id: string) => {
  const m = db.mentors.find((x) => x.id === id);
  if (!m) throw new RuleError("That mentor could not be found.", 404);
  return m;
};

// Pending requests reserve sessions on the mentor. Sessions this month =
// sessions per month the plan needs (the full plan is stored on the request).
export function createRequest(db: Db, profile: StudentProfile, mentorId: string, message: string): MeetingRequest {
  const mentor = findMentor(db, mentorId);
  const text = message.trim();
  if (!text) throw new RuleError("Please write a short message to the mentor first.");
  if (text.length > 1500) throw new RuleError("Please keep your message under 1,500 characters.");

  // Re-check the filters so a stale results page cannot over-book a mentor.
  const reason = filterReason(profile, mentor);
  if (reason) throw new RuleError("This mentor can no longer take this request. Please run the match again.", 409);

  const spm = SESSIONS_PER_MONTH[profile.cadence];
  const req: MeetingRequest = {
    id: `r_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    student_profile: profile,
    mentor_id: mentorId,
    meeting_type: profile.meeting_type,
    group_size: profile.meeting_type === "group" ? profile.group_size : 1,
    cadence: profile.cadence,
    months: profile.cadence === "one_time" ? 1 : profile.months,
    sessions_per_month: spm,
    reserved_sessions_total: reservedSessions(profile.cadence, profile.months),
    message: text,
    status: "pending",
    created_at: new Date().toISOString(),
    merge_group_id: null,
    reservation_held: true,
  };
  mentor.requests_this_month += spm;
  db.requests.push(req);
  return req;
}

function release(db: Db, req: MeetingRequest) {
  if (!req.reservation_held) return;
  const mentor = db.mentors.find((m) => m.id === req.mentor_id);
  if (mentor) mentor.requests_this_month = Math.max(0, mentor.requests_this_month - req.sessions_per_month);
  req.reservation_held = false;
}

// A merged group is decided together.
function groupOf(db: Db, req: MeetingRequest): MeetingRequest[] {
  if (!req.merge_group_id) return [req];
  return db.requests.filter((r) => r.merge_group_id === req.merge_group_id);
}

function ownPending(db: Db, mentorId: string, requestId: string): MeetingRequest {
  const req = db.requests.find((r) => r.id === requestId && r.mentor_id === mentorId);
  if (!req) throw new RuleError("Request not found.", 404);
  if (req.status !== "pending") throw new RuleError("This request has already been answered.", 409);
  return req;
}

export function acceptRequest(db: Db, mentorId: string, requestId: string) {
  for (const r of groupOf(db, ownPending(db, mentorId, requestId))) r.status = "accepted";
}

export function declineRequest(db: Db, mentorId: string, requestId: string) {
  for (const r of groupOf(db, ownPending(db, mentorId, requestId))) {
    r.status = "declined";
    release(db, r); // declining releases the reserved sessions
  }
}

// Merge pending group requests into one group session. The group uses ONE
// session, so every request except the first releases its reservation.
export function mergeRequests(db: Db, mentorId: string, ids: string[]): string {
  const mentor = findMentor(db, mentorId);
  const reqs = [...new Set(ids)].map((id) => ownPending(db, mentorId, id));
  if (reqs.length < 2) throw new RuleError("Pick at least two group requests to merge.");
  if (reqs.some((r) => r.meeting_type !== "group" || !r.student_profile.open_to_group_with_others || r.merge_group_id))
    throw new RuleError("Only group requests from students who are open to being grouped can be merged.");
  if (reqs.some((r) => r.cadence !== reqs[0].cadence || r.months !== reqs[0].months))
    throw new RuleError("Requests need the same schedule to be merged.");
  const total = reqs.reduce((s, r) => s + r.group_size, 0);
  if (total > (mentor.group_size_max ?? 0))
    throw new RuleError(`Those requests add up to ${total} people, above your group limit of ${mentor.group_size_max}.`);

  const gid = `g_${Date.now().toString(36)}`;
  reqs.forEach((r, i) => {
    r.merge_group_id = gid;
    if (i > 0) release(db, r);
  });
  return gid;
}

// Withdrawing a profile or pausing is handled by the caller; this declines
// everything still pending so no student is left waiting.
export function declineAllPending(db: Db, mentorId: string) {
  for (const r of db.requests.filter((x) => x.mentor_id === mentorId && x.status === "pending")) {
    r.status = "declined";
    release(db, r);
  }
}
