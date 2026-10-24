// Server-only LLM helper. The API key lives in .env.local and is read here on
// the server; it is never sent to the browser. If anything goes wrong (no key,
// slow, error, bad output) this returns null and callers use their templates.
import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.MENTORMATCH_MODEL || "claude-haiku-5-5";
const TIMEOUT_MS = 12_000;

let client: Anthropic | null = null;

export function aiAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function askJson(system: string, user: string): Promise<unknown | null> {
  if (!aiAvailable()) return null;
  try {
    client ??= new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 0 });
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: "low" },
      system,
      messages: [{ role: "user", content: user }],
    });
    if (res.stop_reason === "refusal" || res.stop_reason === "max_tokens") return null;
    const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    return JSON.parse(text.slice(start, end + 1));
  } catch (e) {
    console.warn("AI call failed; using template.", (e as Error).message);
    return null;
  }
}
