// Small helpers shared by the route handlers.
import { RuleError } from "./requests";

export const ok = (data: unknown, status = 200) => Response.json(data, { status });
export const fail = (message: string, status = 400) => Response.json({ error: message }, { status });

// Runs a handler body and turns known rule errors into friendly JSON errors.
export async function guard(fn: () => Promise<Response> | Response): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof RuleError) return fail(e.message, e.status);
    console.error(e);
    return fail("Something went wrong on our side. Please try again.", 500);
  }
}

export async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    throw new RuleError("That request could not be read.");
  }
}
