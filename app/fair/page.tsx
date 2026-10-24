import FairnessCheck from "@/components/FairnessCheck";
import Icon, { type IconName } from "@/components/Icon";

const SECTIONS: [IconName, string, string][] = [
  ["user-check", "Consent", "Every mentor opted in before appearing here. They choose the stages, help types and topics they offer, how many sessions they will host each month, and whether they take group conversations. They can pause their profile, which removes them from matching immediately, or remove it entirely."],
  ["scale", "Fairness", "Matching never reads a name, gender, ethnicity, age, photo or location. It scores job-relevant factors only: field, role, company, path overlap and the help you asked for. A fairness adjustment lowers the score of mentors near their session limit so the same few people are not overloaded."],
  ["shield", "Transparency", "Every recommendation shows its factors, the weight each factor carried, and the plain sentence explaining it. You can open the weights panel on your results and re-run the fairness check below. There is no black-box ranking anywhere in the app."],
  ["sliders", "Human control", "The AI writes the one-line explanation and drafts the playbook. It never ranks, filters or sends. You choose the mentor, edit every word, and press send yourself. There is no auto-send anywhere in the product."],
  ["lock", "Privacy", "We only collect what matching needs: your field, stage, target role and company, the help you want, and how you would like to meet. Mentor contact details are never stored and never shown. The conversation happens outside this app, on your terms."],
];

export default function Fair() {
  return (
    <div className="wrap wrap-md space-y-5">
      <div className="space-y-2">
        <p className="eyebrow">Trust</p>
        <h1 className="text-3xl">How this stays fair</h1>
        <p className="max-w-xl text-sm text-muted">
          MentorMatch is for people without a professional network to lean on. That only works if the ranking is honest, explained, and the same for everyone.
          Here is exactly how it works, and how to check it yourself.
        </p>
      </div>
      <div className="space-y-3">
        {SECTIONS.map(([icon, t, d]) => (
          <section key={t} className="card !p-4">
            <h2 className="flex items-center gap-2 text-[15px]"><Icon name={icon} size={15} className="text-accent" />{t}</h2>
            <p className="mt-2 text-[13px] text-muted">{d}</p>
          </section>
        ))}
      </div>
      <FairnessCheck />
    </div>
  );
}
