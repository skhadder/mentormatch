// Browser-only helpers. Everything is kept in the student's own browser:
// no account, no tracking.
import type { StudentProfile } from "./types";

const read = (k: string): string | null => {
  try { return window.sessionStorage.getItem(k) ?? window.localStorage.getItem(k); } catch { return null; }
};

export function saveProfile(p: StudentProfile) {
  try { sessionStorage.setItem("mm_profile", JSON.stringify(p)); } catch {}
}
export function loadProfile(): StudentProfile | null {
  try { return JSON.parse(sessionStorage.getItem("mm_profile") ?? "null"); } catch { return null; }
}

export function setPlaybookMentor(id: string) {
  try { sessionStorage.setItem("mm_playbook_mentor", id); } catch {}
}
export function getPlaybookMentor(): string | null {
  try { return sessionStorage.getItem("mm_playbook_mentor"); } catch { return null; }
}

// "View as mentor" demo selection (not real authentication).
export function getMentorId(): string | null {
  return read("mm_mentor");
}
export function setMentorId(id: string | null) {
  try {
    if (id) sessionStorage.setItem("mm_mentor", id); else sessionStorage.removeItem("mm_mentor");
    window.dispatchEvent(new Event("mm-mentor"));
  } catch {}
}

// Ids of requests this browser sent, so the student can see their status.
export function getSentRequests(): string[] {
  try { return JSON.parse(localStorage.getItem("mm_requests") ?? "[]"); } catch { return []; }
}
export function addSentRequest(id: string) {
  try { localStorage.setItem("mm_requests", JSON.stringify([id, ...getSentRequests()])); } catch {}
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
  } catch {
    throw new Error("We couldn't reach the server. Check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: string; errors?: string[] }).error ?? (data as { errors?: string[] }).errors?.join(" ");
    throw new Error(msg || "Something went wrong. Please try again.");
  }
  return data as T;
}
