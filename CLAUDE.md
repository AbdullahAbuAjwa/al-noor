# Claude Code instructions

Read [AGENTS.md](AGENTS.md), then the current scope in PLAN.md, DECISIONS.md, and README.md. User instructions take precedence over this file.

From milestone 5 (authentication) onward, the applicant directs Claude Code to **implement** the remaining features (DECISIONS D24). Earlier milestones were implemented with ChatGPT Codex and reviewed read-only with Claude Code (D16, D22).

## Git ownership

- The applicant alone runs `git add`, `git commit`, `git push`, and opens or merges PRs. Do not stage, commit, push, or merge, including through other tools.
- A feature branch may be created only from a clean, up-to-date `main`, after the applicant confirms the previous feature is merged. Do not start the next feature before that confirmation.
- Read-only Git inspection is always allowed. Include new untracked files when describing a change; `git diff` alone misses them.

## Implementing a feature

- Work on one milestone at a time, split into two or more commit-sized parts (each with its own tests and a passing build). Implement and verify one part, hand it off, and write the next part only after the applicant confirms it is committed. Do not build a whole milestone before the first handoff.
- Put authorization, timing, and grading rules in server-side services, and check role, ownership, and class membership on every server operation.
- Build every screen in Arabic and English, right-to-left and left-to-right, and usable on a phone from the start.
- Add risk-appropriate tests with the feature. Derive expected values from the brief, seed data, and hand calculation, not from the implementation. Real-database tests must use the real migrations.
- Run the available checks (`npm run check`, `npm test`, `npm run build`), the Docker Compose startup, and the HTTP smoke suite. Do not open the application in a browser; the applicant performs visual checks.
- Ask before destructive commands or anything that could reset existing application data.

## Reporting

- Update README.md, DECISIONS.md, and AI_USAGE.md while working. Record only checks that actually ran, and say what remains unverified.
- At each handoff, report briefly: what changed, test results, what the applicant should try, and the proposed commit or PR title.
- Claude Code's checks of code it wrote are self-verification, not an independent or human review. Do not claim reviews, approvals, or CI runs that did not happen.
