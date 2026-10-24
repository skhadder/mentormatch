// Simple in-memory per-IP limiter for the AI routes. It lives in one server
// process, which is enough for a demo; use a shared store if you ever run
// several instances.
const hits = new Map<string, number[]>();

export const LIMIT = 10;
export const WINDOW_MS = 60_000;

// Returns true if this call is allowed (and records it), false if limited.
export function allow(key: string, now = Date.now(), limit = LIMIT, windowMs = WINDOW_MS): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k);
  return true;
}

// Behind a proxy the client address arrives in x-forwarded-for. That header can
// be spoofed when there is no trusted proxy, so treat this as best-effort.
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || req.headers.get("x-real-ip") || "unknown";
}

export function resetRateLimits() {
  hits.clear();
}
