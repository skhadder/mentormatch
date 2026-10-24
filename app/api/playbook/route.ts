import { body, fail, guard, ok } from "@/lib/api";
import { askJson } from "@/lib/llm";
import { parseProfile } from "@/lib/profile";
import { buildPlaybook, isGroup, isRecurring, mergeAi, sessionCount, templateFollowUp } from "@/lib/playbook";
import { GROUNDING } from "@/lib/prompts";
import { loadDb } from "@/lib/store";

// Returns an AI-written playbook merged over the template. Never throws to the
// client for AI problems: the template version is returned instead.
export async function POST(req: Request) {
  return guard(async () => {
    const b = await body(req);
    const profile = parseProfile(b.profile);
    if (typeof profile === "string") return fail(profile);
    const mentor = loadDb().mentors.find((m) => m.id === b.mentorId && m.opted_in);
    if (!mentor) return fail("Mentor not found.", 404);
    const variant = Number.isInteger(b.variant) ? (b.variant as number) : 0;

    const base = buildPlaybook(profile, mentor, variant);
    const n = sessionCount(profile);
    const shape: Record<string, string> = {
      goal: "string: one sentence goal for the conversation",
      questions: "array of 3 to 5 strings, tailored to this mentor's can_speak_to topics and path",
      followUp: "string: a follow-up message draft with placeholders like [one thing you learned]",
    };
    if (isRecurring(profile)) shape.sessionPlan = `array of ${Math.min(n, 9)} objects {goal, between, followUp}; first session: get oriented and set goals; middle: review progress; last: mock interview or next steps for the stage; "between" is "" for the last`;
    if (isGroup(profile)) shape.groupEtiquette = "array of 3 short tips: share airtime, agree two shared questions beforehand, one person sends the follow-up";

    const ai = await askJson(
      GROUNDING,
      JSON.stringify({
        task: "Write a conversation playbook for the student. Return JSON with exactly these keys.",
        json_shape: shape,
        group_note: isGroup(profile) ? "This is a group conversation: phrase questions with 'we'." : undefined,
        student_answers: {
          stage: profile.stage, field: profile.field, target_role: profile.target_role || null,
          target_company: profile.target_company || null, help_wanted: profile.help_wanted,
          meeting: profile.meeting_type, cadence: profile.cadence, months: profile.months,
        },
        mentor: {
          name: mentor.display_name, role: mentor.role, company: mentor.company, major: mentor.major,
          switched_from_field: mentor.switched_from_field, bio: mentor.bio_for_explanations,
          can_speak_to: mentor.can_speak_to, not_open_to: mentor.not_open_to,
        },
      }),
    );

    const playbook = ai ? mergeAi(base, ai, profile) : base;
    // Regenerating only the draft must still change the text when AI is down.
    if (!ai && variant > 0) playbook.followUp = templateFollowUp(mentor, variant);
    return ok({ playbook, source: ai ? "ai" : "template" });
  });
}
