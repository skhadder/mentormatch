import { describe, expect, it } from "vitest";
import { matchMentors } from "@/lib/matching";
import mentorsJson from "@/data/mentors.json";
import studentsJson from "@/data/students.json";
import type { Mentor, Student } from "@/lib/types";

const mentors = mentorsJson as Mentor[];
const students = studentsJson as Student[];
const byId = (id: string) => students.find((s) => s.id === id)!;

// Builds a mentor with sensible defaults so tests only state what matters.
const mentor = (over: Partial<Mentor>): Mentor => ({
  id: "x",
  name: "Test Mentor",
  field: "SWE",
  role: "Software Engineer",
  company: "Acme",
  yearsExperience: 5,
  path: "computer science graduate",
  careerStagesHelped: ["exploring", "targeting", "applying", "interviewing"],
  topicsOpenTo: ["choosing a path", "resume feedback", "interview prep", "understanding the role"],
  monthlyLimit: 4,
  requestsThisMonth: 0,
  consentAt: "2026-01-15",
  visible: true,
  ...over,
});

describe("filtering", () => {
  it("never returns mentors who are hidden or at their monthly limit", () => {
    for (const s of students) {
      for (const r of matchMentors(s, mentors)) {
        expect(r.mentor.visible).toBe(true);
        expect(r.mentor.requestsThisMonth).toBeLessThan(r.mentor.monthlyLimit);
      }
    }
  });

  it("excludes a perfect-fit mentor who is hidden or full", () => {
    const s = byId("s3");
    const hidden = mentor({ id: "hidden", company: "Google", visible: false });
    const full = mentor({ id: "full", company: "Google", requestsThisMonth: 4 });
    const ok = mentor({ id: "ok" });
    expect(matchMentors(s, [hidden, full, ok]).map((r) => r.mentor.id)).toEqual(["ok"]);
  });

  it("excludes mentors who offer none of the help wanted", () => {
    const s = byId("s4"); // wants interview prep only
    const wrong = mentor({ id: "wrong", topicsOpenTo: ["resume feedback"] });
    expect(matchMentors(s, [wrong])).toEqual([]);
  });

  it("returns at most 3 results", () => {
    expect(matchMentors(byId("s3"), mentors).length).toBeLessThanOrEqual(3);
  });
});

describe("fairness", () => {
  const pairs: [string, string][] = [["s9a", "s9b"], ["s10a", "s10b"]];

  it.each(pairs)("name-swap pair %s / %s gets identical results", (a, b) => {
    const ra = matchMentors(byId(a), mentors);
    const rb = matchMentors(byId(b), mentors);
    expect(ra.length).toBeGreaterThan(0);
    expect(rb).toEqual(ra);
  });

  it("ignores mentor names too", () => {
    const s = byId("s3");
    const renamed = mentors.map((m) => ({ ...m, name: "Anonymous" }));
    const strip = (rs: ReturnType<typeof matchMentors>) =>
      rs.map((r) => ({ id: r.mentor.id, score: r.score, breakdown: r.breakdown }));
    expect(strip(matchMentors(s, renamed))).toEqual(strip(matchMentors(s, mentors)));
  });
});

describe("career stage weighting", () => {
  // A: works at the target company in the target role, different field/background.
  // B: same field and similar background, but different company and role.
  const A = mentor({
    id: "A", field: "Marketing", role: "Software Engineer", company: "Stripe",
    path: "former event planner",
  });
  const B = mentor({
    id: "B", field: "SWE", role: "Designer", company: "Acme",
    path: "computer science major who loves research",
  });
  const base: Student = {
    id: "t", name: "T", careerStage: "exploring", field: "SWE",
    targetCompany: "Stripe", targetRole: "Software Engineer",
    helpWanted: ["resume feedback"], major: "Computer Science", background: "likes research",
  };

  it("exploring students rank field/path matches first", () => {
    const [first] = matchMentors({ ...base, careerStage: "exploring" }, [A, B]);
    expect(first.mentor.id).toBe("B");
  });

  it("applying and interviewing students rank company/role matches first", () => {
    for (const careerStage of ["applying", "interviewing"] as const) {
      const [first] = matchMentors({ ...base, careerStage }, [A, B]);
      expect(first.mentor.id).toBe("A");
    }
  });

  it("mentors with more spare capacity win ties", () => {
    const busy = mentor({ id: "busy", requestsThisMonth: 3 });
    const free = mentor({ id: "free", requestsThisMonth: 0 });
    const [first] = matchMentors(base, [busy, free]);
    expect(first.mentor.id).toBe("free");
  });
});

describe("score breakdown", () => {
  it("is always present and sums to the score", () => {
    for (const s of students) {
      for (const r of matchMentors(s, mentors)) {
        expect(Object.keys(r.breakdown).sort()).toEqual(
          ["field", "loadBalance", "pathMajor", "roleCompany", "stage", "topics"],
        );
        const sum = Object.values(r.breakdown).reduce((a, b) => a + b, 0);
        expect(r.score).toBeCloseTo(sum, 1);
      }
    }
  });

  it("returns results for every test student", () => {
    for (const s of students) expect(matchMentors(s, mentors).length).toBeGreaterThan(0);
  });
});
