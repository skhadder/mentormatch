import { body, fail, guard, ok } from "@/lib/api";
import { templateExplanation } from "@/lib/explain";
import { askJson } from "@/lib/llm";
import { matchMentors } from "@/lib/matching";
import { parseProfile } from "@/lib/profile";
import { GROUNDING } from "@/lib/prompts";
import { loadDb } from "@/lib/store";

// AI-written "Why this match" sentence. It is built from the same scoring data
// as the chips. Any failure returns the template sentence instead.
export async function POST(req: Request) {
  return guard(async () => {
    const b = await body(req);
    const profile = parseProfile(b.profile);
    if (typeof profile === "string") return fail(profile);
    const mentor = loadDb().mentors.find((m) => m.id === b.mentorId);
    if (!mentor) return fail("Mentor not found.", 404);
    const [result] = matchMentors(profile, [mentor]);
    if (!result) return fail("This mentor no longer matches.", 409);

    const template = templateExplanation(result, profile);
    const ai = (await askJson(
      GROUNDING,
      JSON.stringify({
        task: 'Write ONE sentence (max 40 words) explaining why this mentor was matched. Mention only the matched factors listed. Return {"explanation": string}.',
        matched_factors: result.matched.map((c) => ({ factor: c.label, detail: c.detail })),
        student_answers: {
          stage: profile.stage, field: profile.field, target_role: profile.target_role || null,
          target_company: profile.target_company || null, help_wanted: profile.help_wanted,
        },
        mentor: {
          name: mentor.display_name, bio: mentor.bio_for_explanations,
          can_speak_to: mentor.can_speak_to, not_open_to: mentor.not_open_to,
        },
      }),
    )) as { explanation?: unknown } | null;

    const text = typeof ai?.explanation === "string" ? ai.explanation.trim() : "";
    const good = text.length > 10 && text.length < 400 && !text.includes("\n");
    return ok({ explanation: good ? text : template, source: good ? "ai" : "template" });
  });
}
