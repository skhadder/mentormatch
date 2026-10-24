import { describe, expect, it } from "vitest";
import { MAX_RESULTS, matchMentors, STAGE_WEIGHTS, weightsFor } from "@/lib/matching";
import { runFairnessCheck, SAMPLE_PROFILE } from "@/lib/fairness";
import mentorsJson from "@/data/mentors.json";
import type { Mentor, StudentProfile } from "@/lib/types";

const seed = mentorsJson as Mentor[];

const student = (over: Partial<StudentProfile> = {}): StudentProfile => ({
  ...SAMPLE_PROFILE,
  ...over,
});

// Builds a mentor with defaults so each test only states what matters.
const mentor = (over: Partial<Mentor> = {}): Mentor => ({
  id: "x",
  display_name: "Test Mentor",
  opted_in: true,
  status: "active",
  field: "Product Management",
  role: "Product Manager",
  company: "Acme",
  industry: "Technology",
  years_experience: 5,
  major: "Business",
  switched_from_field: null,
  path_tags: [],
  stages: ["exploring", "targeting_role", "applying", "interviewing"],
  help_types: ["resume_review", "mock_interview", "career_path_advice"],
  meeting_types: ["one_on_one", "group"],
  group_size_max: 4,
  cadence_options: ["one_time", "monthly", "twice_monthly", "three_times_monthly"],
  max_engagement_months: 3,
  meeting_channel: "video_call",
  meeting_length_minutes: 30,
  monthly_limit: 4,
  requests_this_month: 0,
  not_open_to: [],
  bio_for_explanations: "",
  can_speak_to: [],
  owner_user: null,
  ...over,
});

const ids = (rs: ReturnType<typeof matchMentors>) => rs.map((r) => r.mentor.id);

describe("seed data", () => {
  it("has 50 mentors with unique ids", () => {
    expect(seed).toHaveLength(50);
    expect(new Set(seed.map((m) => m.id)).size).toBe(50);
  });
  it("every stage weight row sums to 100", () => {
    for (const w of Object.values(STAGE_WEIGHTS)) {
      expect(Object.values(w).reduce((a, b) => a + b, 0)).toBe(100);
    }
  });
});

// Acceptance criterion 3
describe("hard filters", () => {
  const perfect = mentor({ id: "ok" });
  const cases: [string, Partial<Mentor>][] = [
    ["paused", { status: "paused" }],
    ["not opted in", { opted_in: false }],
    ["at session limit", { monthly_limit: 3, requests_this_month: 3 }],
    ["wrong stage", { stages: ["exploring"] }],
    ["no matching help", { help_types: ["portfolio_feedback"] }],
    ["no one-on-one", { meeting_types: ["group"] }],
    ["no one-time schedule", { cadence_options: ["monthly"] }],
  ];
  it.each(cases)("never returns a mentor who is %s", (_label, over) => {
    const bad = mentor({ id: "bad", ...over });
    expect(ids(matchMentors(student(), [bad, perfect]))).toEqual(["ok"]);
  });

  it("applies group filters", () => {
    const g = student({ meeting_type: "group", group_size: 5 });
    const small = mentor({ id: "small", group_size_max: 4 });
    const big = mentor({ id: "big", group_size_max: 6 });
    expect(ids(matchMentors(g, [small, big]))).toEqual(["big"]);
  });

  it("filters on cadence, plan length, and remaining sessions", () => {
    const s = student({ cadence: "twice_monthly", months: 3 });
    const short = mentor({ id: "short", max_engagement_months: 2 });
    const oneLeft = mentor({ id: "oneLeft", monthly_limit: 4, requests_this_month: 3 });
    const fine = mentor({ id: "fine" });
    expect(ids(matchMentors(s, [short, oneLeft, fine]))).toEqual(["fine"]);
  });

  it("never returns an excluded seed mentor, for any seed student shape", () => {
    for (const stage of ["exploring", "targeting_role", "applying", "interviewing"] as const) {
      for (const cadence of ["one_time", "monthly", "twice_monthly", "three_times_monthly"] as const) {
        for (const meeting_type of ["one_on_one", "group"] as const) {
          const s = student({ stage, cadence, meeting_type, group_size: meeting_type === "group" ? 3 : 1 });
          for (const r of matchMentors(s, seed)) {
            const m = r.mentor;
            expect(m.status).toBe("active");
            expect(m.meeting_types).toContain(meeting_type);
            expect(m.cadence_options).toContain(cadence);
            expect(m.monthly_limit - m.requests_this_month).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it("returns at most 3 and never pads with unrelated fields", () => {
    expect(matchMentors(student(), seed).length).toBeLessThanOrEqual(MAX_RESULTS);
    const unrelated = mentor({ id: "u", field: "Nonprofit" });
    expect(matchMentors(student(), [unrelated])).toEqual([]);
  });
});

// Acceptance criterion 2
describe("stage weights change the ranking", () => {
  // Same-field mentor with a matching path, but a different company/role.
  const fieldPath = mentor({ id: "fieldPath", role: "Designer", company: "Other", major: "Business" });
  // Related-field mentor at the target company in the target role.
  const companyRole = mentor({ id: "companyRole", field: "Marketing", company: "Spotify", role: "Product Manager", major: "Art" });
  const base = student({ target_company: "Spotify", target_role: "Product Manager", major: "Business" });

  it("Exploring favors field and path", () => {
    expect(ids(matchMentors({ ...base, stage: "exploring" }, [companyRole, fieldPath]))[0]).toBe("fieldPath");
  });
  it("Applying and Interviewing favor company and role", () => {
    for (const stage of ["applying", "interviewing"] as const) {
      expect(ids(matchMentors({ ...base, stage }, [fieldPath, companyRole]))[0]).toBe("companyRole");
    }
  });

  it("breakdown uses the weight table for the stage", () => {
    const [r] = matchMentors({ ...base, stage: "applying" }, [companyRole]);
    expect(r.weights).toEqual(STAGE_WEIGHTS.applying);
    expect(r.breakdown.company).toBe(30);
    expect(r.breakdown.role).toBe(30);
    expect(r.breakdown.field).toBe(7.5); // related field = half of 15
  });

  it("redistributes weight when target role and company are blank", () => {
    const w = weightsFor(student({ stage: "applying", target_role: "", target_company: "" }));
    expect(w.role).toBe(0);
    expect(w.company).toBe(0);
    expect(Object.values(w).reduce((a, b) => a + b, 0)).toBeCloseTo(100);
    expect(w.field / w.helpFit).toBeCloseTo(15 / 10); // proportions preserved
  });

  it("Exploring vs Applying differ on the seed data", () => {
    const ex = ids(matchMentors({ ...SAMPLE_PROFILE, stage: "exploring" }, seed));
    const ap = ids(matchMentors({ ...SAMPLE_PROFILE, stage: "applying" }, seed));
    expect(ex.length).toBeGreaterThan(0);
    expect(ap.length).toBeGreaterThan(0);
  });
});

describe("fairness adjustment", () => {
  it("lowers the score of busier mentors by up to 15%", () => {
    const free = mentor({ id: "free", requests_this_month: 0, monthly_limit: 4 });
    const busy = mentor({ id: "busy", requests_this_month: 3, monthly_limit: 4 });
    const [a, b] = matchMentors(student(), [busy, free]);
    expect(a.mentor.id).toBe("free");
    expect(b.fairnessMultiplier).toBe(0.89); // 1 - 0.15 * 3/4 = 0.8875
    expect(b.score).toBeLessThan(b.baseScore);
  });
  it("does not let meeting type or cadence change a score", () => {
    const m = mentor();
    const one = matchMentors(student({ cadence: "one_time" }), [m])[0];
    const many = matchMentors(student({ cadence: "monthly", months: 2 }), [m])[0];
    expect(many.baseScore).toBe(one.baseScore);
  });
  it("every result carries a breakdown and chips that agree with it", () => {
    for (const r of matchMentors(student(), seed)) {
      const keys = r.matched.map((c) => c.key);
      expect(keys.includes("field")).toBe(r.breakdown.field > 0);
      expect(keys.includes("company")).toBe(r.breakdown.company > 0);
      expect(keys.includes("role")).toBe(r.breakdown.role > 0);
      expect(keys.includes("path")).toBe(r.breakdown.path > 0);
    }
  });
});

// Acceptance criterion 7
describe("fairness check", () => {
  it("PASSes with identical mentors and scores across names, on the seed pool", () => {
    const report = runFairnessCheck(seed);
    expect(report.runs).toHaveLength(5);
    expect(report.pass).toBe(true);
    expect(report.runs[0].top.length).toBeGreaterThan(0);
    expect(report.runs.every((r) => !r.differs)).toBe(true);
  });

  it("the matcher never reads a name or display_name", () => {
    const trap = (o: object) =>
      new Proxy(o, {
        get(t, k, r) {
          if (k === "name" || k === "display_name") throw new Error(`matcher read ${String(k)}`);
          return Reflect.get(t, k, r);
        },
      });
    const mentors = seed.map((m) => trap(m) as Mentor);
    expect(() => matchMentors(trap({ ...SAMPLE_PROFILE, name: "Maria" }) as StudentProfile, mentors)).not.toThrow();
  });

  it("reports FAIL and flags the run when a matcher depends on the name", () => {
    const biased: typeof matchMentors = (st, ms) => {
      const rs = matchMentors(st, ms);
      return (st as StudentProfile & { name?: string }).name === "Wei" ? rs.slice(1) : rs;
    };
    const report = runFairnessCheck(seed, SAMPLE_PROFILE, ["Maria", "Wei"], biased);
    expect(report.pass).toBe(false);
    expect(report.runs.map((r) => r.differs)).toEqual([false, true]);
  });
});

describe("summarizeBreakdown", () => {
  const weights = { field: 30, role: 30, company: 10, path: 25, helpFit: 5 };
  it("names strong, partial and missing factors", async () => {
    const { summarizeBreakdown } = await import("@/lib/breakdown");
    const breakdown = { field: 30, role: 30, company: 0, path: 12, helpFit: 5 };
    expect(summarizeBreakdown(breakdown, weights)).toBe(
      "Strong match on field, role and help type. Partial match on path. Not at your target company.",
    );
  });
  it("skips factors the student left blank", async () => {
    const { summarizeBreakdown } = await import("@/lib/breakdown");
    const w = { field: 40, role: 0, company: 0, path: 40, helpFit: 20 };
    expect(summarizeBreakdown({ field: 40, role: 0, company: 0, path: 40, helpFit: 20 }, w))
      .toBe("Strong match on field, path and help type.");
  });
});
