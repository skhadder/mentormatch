# MentorMatch

Matches beginners with mentors who opted in, using transparent, fairness-tested scoring, then prepares a conversation playbook. Hackathon prototype: all 50 mentors are fictional.

## Run it

```bash
npm install
cp .env.example .env.local   # optional: add ANTHROPIC_API_KEY for AI text
npm run dev                  # http://localhost:3000
npm test                     # Vitest
```

Without an API key every screen still works using template text.

## How it works

- `lib/matching.ts`: plain-code matcher (filters, stage weights, fairness adjustment). Never reads names.
- `lib/requests.ts`, `lib/store.ts`: meeting requests and capacity, stored in `.data/db.json` (created from `data/mentors.json` on first run; `POST /api/seed` resets it).
- `lib/llm.ts`, `app/api/explain`, `app/api/playbook`: server-side AI for "Why this match" and playbooks only. The key never reaches the browser.
- `/mentor` is a **demo** "View as mentor" selector, not real authentication.
