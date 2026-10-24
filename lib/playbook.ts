// Playbook content and its template version. The template is what students see
// first (and whenever AI is unavailable), so it must be complete on its own.
// AI output is validated and merged by `mergeAi`; the "what to avoid" list and
// the structure for the meeting choice are always enforced here in code.

import { reservedSessions } from "./labels";
import type { Mentor, Stage, StudentProfile } from "./types";

export interface SessionPlanItem {
  session: number;
  goal: string;
  between: string; // short to-do for between sessions ("" after the last one)
  followUp: string; // one follow-up draft per session
}

export interface Playbook {
  goal: string;
  questions: string[];
  avoid: string[];
  followUp: string;
  sessionPlan?: SessionPlanItem[]; // recurring only
  groupEtiquette?: string[]; // group only
}

export type PlaybookMentor = Pick<
  Mentor,
  "display_name" | "role" | "company" | "field" | "major" | "switched_from_field" | "can_speak_to" | "not_open_to" | "bio_for_explanations"
>;

const GOALS: Record<Stage, string> = {
  exploring: "Understand what this work is really like day to day, and whether it could fit you.",
  targeting_role: "Learn the realistic path into the role you want and the first steps to take.",
  applying: "Learn what to highlight in your applications before you apply.",
  interviewing: "Practice, and learn how interviews are run so you walk in prepared.",
};

const STAGE_QUESTION: Record<Stage, (g: boolean) => string> = {
  exploring: (g) => `What do ${g ? "we" : "I"} most need to know about this field that ${g ? "we" : "I"} won't find online?`,
  targeting_role: (g) => `If ${g ? "we were" : "I were"} starting over, what would the first three steps be?`,
  applying: (g) => `What stands out to you on a ${g ? "student's" : "beginner's"} resume or application, and what gets skipped?`,
  interviewing: (g) => `How are interviews for this role usually structured, and how should ${g ? "we" : "I"} prepare?`,
};

export const ALWAYS_AVOID = "Asking for a referral in a first chat";

export function avoidList(m: Pick<Mentor, "not_open_to">): string[] {
  const own = m.not_open_to.map((x) => x.charAt(0).toUpperCase() + x.slice(1));
  return [ALWAYS_AVOID, ...own.filter((x) => x.toLowerCase() !== ALWAYS_AVOID.toLowerCase() && x.toLowerCase() !== "asking for a referral in a first chat")];
}

export function sessionCount(p: StudentProfile): number {
  return reservedSessions(p.cadence, p.months);
}

export const isGroup = (p: StudentProfile) => p.meeting_type === "group";
export const isRecurring = (p: StudentProfile) => p.cadence !== "one_time";

function templateQuestions(p: StudentProfile, m: PlaybookMentor): string[] {
  const g = isGroup(p);
  const q: string[] = [];
  q.push(
    m.switched_from_field
      ? `You moved from ${m.switched_from_field} into ${m.field}. What made you decide, and what was hardest about the switch?`
      : `You studied ${m.major} and now work as a ${m.role}. How did that path unfold?`,
  );
  if (m.can_speak_to[0]) q.push(`You can speak to ${m.can_speak_to[0]}. What would you tell someone at ${g ? "our" : "my"} stage about it?`);
  if (m.can_speak_to[1]) q.push(`What's a common mistake beginners make around ${m.can_speak_to[1]}?`);
  q.push(`What does a typical week look like for a ${m.role} at ${m.company}?`);
  q.push(STAGE_QUESTION[p.stage](g));
  return q.slice(0, 5);
}

const FOLLOW_UPS = [
  (m: PlaybookMentor) =>
    `Hi ${m.display_name},\n\nThank you for talking with me today. One thing I learned was [one thing you learned], and I'm going to [one next step you'll take] this week.\n\nI really appreciated your time.\n\n[Your name]`,
  (m: PlaybookMentor) =>
    `Hi ${m.display_name},\n\nThanks so much for the conversation. Your advice about [something they said] stuck with me. My next step is [what you'll do], and I'd be glad to share how it goes if that's helpful.\n\n[Your name]`,
  (m: PlaybookMentor) =>
    `Dear ${m.display_name},\n\nI wanted to say thank you. Hearing about [part of their story] helped me see [what changed for you]. I plan to [next step].\n\nBest,\n[Your name]`,
];

export function templateFollowUp(m: PlaybookMentor, variant = 0): string {
  return FOLLOW_UPS[variant % FOLLOW_UPS.length](m);
}

function templateSessionPlan(p: StudentProfile, m: PlaybookMentor): SessionPlanItem[] {
  const n = sessionCount(p);
  const items: SessionPlanItem[] = [];
  const shown = Math.min(n, 9);
  for (let i = 1; i <= shown; i++) {
    const last = i === shown;
    const goal =
      i === 1
        ? "Get oriented and set goals together."
        : last
          ? p.stage === "applying" || p.stage === "interviewing"
            ? "Run a mock interview and agree on next steps."
            : "Review what you've learned and agree on next steps."
          : p.stage === "exploring" || p.stage === "targeting_role"
            ? "Review your progress and talk through what you've tried."
            : "Review progress on your resume or portfolio.";
    items.push({
      session: i,
      goal,
      between: last ? "" : i === 1 ? "Write down your goals and finish one small task you agreed on." : "Apply the feedback you got and note what is still unclear.",
      followUp: templateFollowUp(m, i - 1),
    });
  }
  return items;
}

const GROUP_TIPS = [
  "Share airtime: keep your questions short and leave room for others.",
  "Agree on two shared questions with the group beforehand.",
  "Pick one person to send the follow-up message for the group.",
];

export function buildPlaybook(p: StudentProfile, m: PlaybookMentor, variant = 0): Playbook {
  const pb: Playbook = {
    goal: GOALS[p.stage],
    questions: templateQuestions(p, m),
    avoid: avoidList(m),
    followUp: templateFollowUp(m, variant),
  };
  if (isRecurring(p)) pb.sessionPlan = templateSessionPlan(p, m);
  if (isGroup(p)) pb.groupEtiquette = GROUP_TIPS;
  return pb;
}

// ---- AI result handling ----------------------------------------------------

const isStr = (x: unknown): x is string => typeof x === "string" && x.trim().length > 0 && x.length < 1200;
const strs = (x: unknown, min: number, max: number): string[] | null =>
  Array.isArray(x) && x.length >= min && x.every(isStr) ? (x as string[]).slice(0, max) : null;

// Takes whatever the model returned and keeps only the valid parts on top of the
// template. Anything missing or malformed falls back to the template text.
export function mergeAi(base: Playbook, ai: unknown, p: StudentProfile): Playbook {
  const o = (ai ?? {}) as Record<string, unknown>;
  const out: Playbook = { ...base };
  if (isStr(o.goal)) out.goal = o.goal;
  const qs = strs(o.questions, 3, 5);
  if (qs) out.questions = qs;
  if (isStr(o.followUp)) out.followUp = o.followUp;
  // `avoid` is always built in code so the required items can never go missing.
  if (base.sessionPlan && Array.isArray(o.sessionPlan)) {
    const items = o.sessionPlan as Record<string, unknown>[];
    out.sessionPlan = base.sessionPlan.map((t, i) => {
      const a = items[i];
      return a && isStr(a.goal) ? { ...t, goal: a.goal, between: t.between && isStr(a.between) ? a.between : t.between, followUp: isStr(a.followUp) ? a.followUp : t.followUp } : t;
    });
  }
  if (isGroup(p)) {
    const tips = strs(o.groupEtiquette, 3, 5);
    if (tips) out.groupEtiquette = tips;
  }
  return out;
}
