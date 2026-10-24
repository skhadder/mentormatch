import { body, guard, ok, fail } from "@/lib/api";
import { templateExplanation } from "@/lib/explain";
import { matchMentors, oneTimeWouldHelp } from "@/lib/matching";
import { publicMentor } from "@/lib/mentorSettings";
import { parseProfile } from "@/lib/profile";
import { loadDb } from "@/lib/store";

// The matcher is plain code. This route also adds the template explanation so
// the page never waits on AI.
export async function POST(req: Request) {
  return guard(async () => {
    const profile = parseProfile((await body(req)).profile);
    if (typeof profile === "string") return fail(profile);
    const mentors = loadDb().mentors;
    const results = matchMentors(profile, mentors);
    return ok({
      profile,
      results: results.map((r) => ({
        ...r,
        mentor: publicMentor(r.mentor),
        explanation: templateExplanation(r, profile),
      })),
      oneTimeWouldHelp: oneTimeWouldHelp(profile, mentors, results.length),
    });
  });
}
