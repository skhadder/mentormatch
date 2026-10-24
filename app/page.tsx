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

export default function Home() {
  return (
    <div className="-my-8 sm:-my-12">
      <section className="paper border-b border-line py-14 sm:py-20">
        <div className="wrap wrap-lg space-y-5">
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
      </section>

      <section className="border-b border-line py-12" aria-labelledby="how">
        <div className="wrap wrap-lg space-y-5">
          <h2 id="how" className="eyebrow !font-semibold">How it works</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {STEPS.map(([icon, step, title, text]) => (
              <div key={step} className="card space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span className="inline-flex size-8 items-center justify-center rounded-full bg-surface text-accent"><Icon name={icon} size={15} /></span>
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
          <div className="callout !bg-[#f2f5f5] space-y-3 !p-6">
            <h2 className="flex items-center gap-2 text-base"><Icon name="sparkles" size={16} className="text-accent" />Honest about what this is</h2>
            <p className="max-w-2xl text-sm text-muted">
              MentorMatch is a hackathon prototype. The mentor pool is 50 fictional profiles, each labelled synthetic, and no real person
              receives anything from this app. The matching is real code you can inspect and test on the fairness page. The AI only writes
              the explanation and the playbook, and the whole app still works if it is switched off.
            </p>
            <Link href="/find" className="btn btn-secondary">Try the intake</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
