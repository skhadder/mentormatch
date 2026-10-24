import { describe, expect, it } from "vitest";
import { matchMentors } from "@/lib/matching";
import { SAMPLE_PROFILE } from "@/lib/fairness";
import { validateMentor } from "@/lib/mentorSettings";
import { buildPlaybook, mergeAi } from "@/lib/playbook";
import { acceptRequest, createRequest, declineRequest, mergeRequests, RuleError, type Db } from "@/lib/requests";
import mentorsJson from "@/data/mentors.json";
import type { Mentor, StudentProfile } from "@/lib/types";

const fresh = (): Db => ({ mentors: structuredClone(mentorsJson) as Mentor[], requests: [] });
const profile = (over: Partial<StudentProfile> = {}): StudentProfile => ({ ...SAMPLE_PROFILE, ...over });

function topFor(db: Db, p: StudentProfile) {
  const [top] = matchMentors(p, db.mentors);
  expect(top).toBeDefined();
  return top.mentor;
}

const NAME = "Sam Rivera";

describe("meeting requests (criterion 5)", () => {
  it("send reserves, decline releases, and matching sees both immediately", () => {
    const db = fresh();
    const p = profile();
    const m = topFor(db, p);
    const before = m.requests_this_month;
    const req = createRequest(db, p, m.id, "Hello, I'd love to learn from you.", NAME);
    expect(req.status).toBe("pending");
    expect(db.mentors.find((x) => x.id === m.id)!.requests_this_month).toBe(before + 1);
    declineRequest(db, m.id, req.id);
    expect(db.mentors.find((x) => x.id === m.id)!.requests_this_month).toBe(before);
    expect(db.requests[0].status).toBe("declined");
  });

  it("a full mentor disappears from matching and cannot be over-booked", () => {
    const db = fresh();
    const p = profile();
    const m = topFor(db, p);
    const mm = db.mentors.find((x) => x.id === m.id)!;
    mm.requests_this_month = mm.monthly_limit - 1;
    createRequest(db, p, m.id, "Hi", NAME);
    expect(matchMentors(p, db.mentors).some((r) => r.mentor.id === m.id)).toBe(false);
    expect(() => createRequest(db, p, m.id, "Hi again", NAME)).toThrow(RuleError);
  });

  it("rejects an empty message", () => {
    const db = fresh();
    expect(() => createRequest(db, profile(), topFor(db, profile()).id, "   ", NAME)).toThrow(/message/i);
  });

  it("accept keeps the reservation", () => {
    const db = fresh();
    const m = topFor(db, profile());
    const before = m.requests_this_month;
    const req = createRequest(db, profile(), m.id, "Hi", NAME);
    acceptRequest(db, m.id, req.id);
    expect(db.requests[0].status).toBe("accepted");
    expect(m.requests_this_month).toBe(before + 1);
  });

  it("a mentor cannot answer another mentor's request", () => {
    const db = fresh();
    const m = topFor(db, profile());
    const req = createRequest(db, profile(), m.id, "Hi", NAME);
    const other = db.mentors.find((x) => x.id !== m.id)!;
    expect(() => declineRequest(db, other.id, req.id)).toThrow(RuleError);
  });

  it("merging group requests uses one session", () => {
    const db = fresh();
    const g = profile({ meeting_type: "group", group_size: 2, open_to_group_with_others: true });
    const m = topFor(db, g);
    const mm = db.mentors.find((x) => x.id === m.id)!;
    mm.group_size_max = 6;
    const before = mm.requests_this_month;
    const a = createRequest(db, g, m.id, "A", NAME);
    const b = createRequest(db, g, m.id, "B", NAME);
    expect(mm.requests_this_month).toBe(before + 2);
    mergeRequests(db, m.id, [a.id, b.id]);
    expect(mm.requests_this_month).toBe(before + 1);
    declineRequest(db, m.id, a.id); // declines the whole group, releases once
    expect(mm.requests_this_month).toBe(before);
    expect(db.requests.every((r) => r.status === "declined")).toBe(true);
  });

  it("refuses to merge beyond the mentor's group limit", () => {
    const db = fresh();
    const g = profile({ meeting_type: "group", group_size: 3, open_to_group_with_others: true });
    const m = topFor(db, g);
    const mm = db.mentors.find((x) => x.id === m.id)!;
    mm.group_size_max = 5;
    const a = createRequest(db, g, m.id, "A", NAME);
    const b = createRequest(db, g, m.id, "B", NAME);
    expect(() => mergeRequests(db, m.id, [a.id, b.id])).toThrow(/above your group limit/);
  });
});

describe("mentor changes reach matching right away (criterion 6)", () => {
  it("dropping a schedule removes the mentor from results", () => {
    const db = fresh();
    const p = profile();
    const m = topFor(db, p);
    expect(matchMentors(p, db.mentors).some((r) => r.mentor.id === m.id)).toBe(true);
    db.mentors.find((x) => x.id === m.id)!.cadence_options = ["monthly"];
    expect(matchMentors(p, db.mentors).some((r) => r.mentor.id === m.id)).toBe(false);
  });
  it("pausing removes the mentor", () => {
    const db = fresh();
    const m = topFor(db, profile());
    db.mentors.find((x) => x.id === m.id)!.status = "paused";
    expect(matchMentors(profile(), db.mentors).some((r) => r.mentor.id === m.id)).toBe(false);
  });
  it("validates that schedules fit inside the session limit", () => {
    const m = { ...(mentorsJson[0] as Mentor), cadence_options: ["three_times_monthly" as const], monthly_limit: 2 };
    expect(validateMentor(m).join(" ")).toMatch(/at least 3 sessions/);
    expect(validateMentor({ ...m, monthly_limit: 3 })).toEqual([]);
  });
});

describe("playbook (criteria 4 and 8)", () => {
  const m = mentorsJson[0] as Mentor;
  it("one-time one-on-one has no session plan or group etiquette", () => {
    const pb = buildPlaybook(profile(), m);
    expect(pb.sessionPlan).toBeUndefined();
    expect(pb.groupEtiquette).toBeUndefined();
    expect(pb.questions.length).toBeGreaterThanOrEqual(3);
    expect(pb.questions.length).toBeLessThanOrEqual(5);
  });
  it("recurring adds one session per session, group adds etiquette", () => {
    const rec = buildPlaybook(profile({ cadence: "twice_monthly", months: 2 }), m);
    expect(rec.sessionPlan).toHaveLength(4);
    expect(rec.sessionPlan!.every((s) => s.followUp)).toBe(true);
    const grp = buildPlaybook(profile({ meeting_type: "group", group_size: 3 }), m);
    expect(grp.groupEtiquette).toHaveLength(3);
  });
  it("always warns about referrals and lists every not-open-to item", () => {
    const pb = buildPlaybook(profile(), m);
    expect(pb.avoid[0]).toMatch(/referral/i);
    for (const item of m.not_open_to) expect(pb.avoid.join(" ").toLowerCase()).toContain(item.toLowerCase());
  });
  it("AI output can never remove the avoid list, and bad AI output falls back to the template", () => {
    const base = buildPlaybook(profile(), m);
    const merged = mergeAi(base, { avoid: [], questions: ["only one"], goal: 5 }, profile());
    expect(merged.avoid).toEqual(base.avoid);
    expect(merged.questions).toEqual(base.questions);
    expect(merged.goal).toBe(base.goal);
    expect(mergeAi(base, null, profile())).toEqual(base);
  });
});

describe("student name on a request", () => {
  it("is trimmed, stored on the request, and shown to the mentor's data", () => {
    const db = fresh();
    const m = topFor(db, profile());
    const req = createRequest(db, profile(), m.id, "Hi", "  Sam   Rivera ");
    expect(req.student_name).toBe("Sam Rivera");
  });

  it.each(["", "Sam", "   ", "Sam <b>R</b>", "http://x.com y", "sam@x.com Rivera", "Sam R2", "A ".repeat(50)])(
    "rejects %j and holds no session",
    (bad) => {
      const db = fresh();
      const m = topFor(db, profile());
      const before = db.mentors.find((x) => x.id === m.id)!.requests_this_month;
      expect(() => createRequest(db, profile(), m.id, "Hi", bad)).toThrow(RuleError);
      expect(db.requests).toHaveLength(0);
      expect(db.mentors.find((x) => x.id === m.id)!.requests_this_month).toBe(before);
    },
  );
});
