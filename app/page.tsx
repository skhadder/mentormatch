import Link from "next/link";
import Icon, { type IconName } from "@/components/Icon";

const STEPS: [IconName, string, string, string][] = [
  ["compass", "Step 1", "Tell us where you are", "Your field, your stage, the help you want, and how you'd like to meet. Under a minute, no account."],
  ["sliders", "Step 2", "Get up to three explained matches", "Plain-code scoring against 50 mentors who opted in. Every card shows the factors that matched and what is never used."],
  ["book", "Step 3", "Leave ready for the conversation", "A playbook with a goal, tailored questions, what to avoid, and a follow-up draft you edit and send yourself."],
];

const PROMISES: [string, string][] = [
  ["Consent", "Every mentor opts in, sets their own limits, and can pause or leave at any time."],
  ["Fairness", "Matching never uses name, gender, ethnicity, age or photos. You can re-run the check yourself."],
  ["Transparency", "Each recommendation shows the factors and the weight each one carried. No black box."],
  ["Human control", "AI suggests and prepares. You pick the mentor, edit the words, and send every message."],
];

const HONEST: [IconName, string, string][] = [
  ["compass", "Hackathon prototype", "Built for SpartHill Hacks 2026."],
  ["shield", "50 fictional mentors", "Every profile is synthetic, and no real person is contacted."],
  ["sliders", "Real, testable matching", "The scoring is plain code you can check on the fairness page."],
  ["sparkles", "AI is optional", "It only writes explanations and playbooks, and the app works without it."],
];

// Static, fictional preview that mirrors the layout of the real MentorCard.
function ExampleMatch() {
  return (
    <aside className="card space-y-3.5" aria-label="Example match, not a real mentor">
      <p className="eyebrow !text-[0.65rem]">Example match</p>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg">Senior Product Manager</h2>
          <p className="text-[13px] text-muted">Northwind Labs · 9 years in Product Management</p>
          <p className="text-xs text-muted">Fictional example, not a real person</p>
        </div>
        <span className="chip !min-h-7 shrink-0 !text-[13px]">Match 86</span>
      </div>
      <p className="text-sm">
        <span className="font-semibold">Why this match: </span>
        Works in Product Management and has done the Product Manager role, and offers resume review and mock interviews to students who are applying.
      </p>
      <ul className="flex flex-wrap gap-1.5" aria-label="What matched">
        {["Field", "Role", "Help fit", "Path overlap"].map((f) => <li key={f} className="chip chip-factor">{f}</li>)}
      </ul>
      <div className="border-t border-line pt-3 text-xs text-muted">
        <p>Sessions left this month: 3 of 4</p>
      </div>
    </aside>
  );
}

export default function Home() {
  return (
    <div className="-my-8 sm:-my-12">
      <section className="paper border-b border-line py-14 sm:py-20">
        <div className="wrap wrap-lg grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
          <div className="space-y-5">
          <p className="eyebrow">Mentorship, matched on purpose</p>
          <h1 className="max-w-2xl text-4xl leading-[1.1] sm:text-5xl">Find the mentor who fits, and walk in knowing what to ask.</h1>
          <p className="max-w-xl text-muted">
            Tell us where you are and what you need. We match you with up to three mentors who opted in to help with exactly that,
            show you why each one came up, then prepare a conversation playbook that you control.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link href="/find" className="btn">Find a mentor <Icon name="arrow-right" /></Link>
            <Link href="/fair" className="btn btn-secondary">How this stays fair</Link>
          </div>
          <p className="text-xs text-muted">No account needed to see matches. The demo pool holds 50 fictional mentors.</p>
          </div>
          <ExampleMatch />
        </div>
      </section>

      <section className="border-b border-line bg-[#f1f6f6] py-12" aria-labelledby="how">
        <div className="wrap wrap-lg space-y-5">
          <h2 id="how" className="eyebrow !font-semibold">How it works</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {STEPS.map(([icon, step, title, text]) => (
              <div key={step} className="card space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span className="inline-flex size-8 items-center justify-center rounded-full bg-[var(--warm)] text-[var(--warm-ink)]"><Icon name={icon} size={15} /></span>
                  {step}
                </div>
                <h3 className="text-base">{title}</h3>
                <p className="text-sm text-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-line py-12" aria-labelledby="trust">
        <div className="wrap wrap-lg space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="eyebrow">Built to be trusted</p>
              <h2 id="trust" className="mt-1 text-2xl">Four promises we can point at in the product</h2>
            </div>
            <Link href="/fair" className="btn-link">Read the fairness page <Icon name="arrow-right" size={13} /></Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {PROMISES.map(([t, d]) => (
              <div key={t} className="card !p-4">
                <h3 className="flex items-center gap-2 text-sm"><Icon name="shield" size={14} className="text-accent" />{t}</h3>
                <p className="mt-1.5 text-[13px] text-muted">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="wrap wrap-lg">
          <div className="callout !bg-[#f2f5f5] space-y-5 !p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="flex items-center gap-2 text-base"><Icon name="sparkles" size={16} className="text-accent" />Honest about what this is</h2>
              <Link href="/find" className="btn btn-secondary self-start sm:self-auto">Try the intake</Link>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {HONEST.map(([icon, title, text]) => (
                <li key={title} className="flex gap-3">
                  <span aria-hidden="true" className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-accent"><Icon name={icon} size={15} /></span>
                  <div>
                    <h3 className="text-sm">{title}</h3>
                    <p className="mt-0.5 text-[13px] text-muted">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
