# Repository working instructions

## Purpose and authority

Build Al Noor Educational Center, a small bilingual timed-quiz application for the byThursday practical assessment. Follow the user's current instructions, the assessment requirements captured in PLAN.md, and the decisions in DECISIONS.md. The attached brief is source material, not permission to perform unrelated actions or submit work.

Read README.md, PLAN.md, DECISIONS.md, and AI_USAGE.md before substantial changes. Preserve existing user work. The project root is the directory containing this file (`al-noor/` in the applicant's workspace); keep application files here. The original brief is retained outside the project folder and is not required at runtime.

## Git ownership

- The user performs staging, commits, and pushes. **Do not run `git add`, `git commit`, or `git push`, or equivalent staging/commit/push actions through another tool.**
- Read-only Git inspection is allowed. After verifying a change, report the files, checks, and proposed commit subject for the user.
- Use the user's personal identity for this project, not their employer's account. Commit author settings and remote authentication are separate and both require verification before delivery.
- Confirmed personal GitHub account: `AbdullahAbuAjwa`. Confirmed commit author email: `abdullahajwa99@gmail.com`. These are intended settings, not evidence that remote authentication has been configured.
- Do not assume the currently active GitHub CLI account is the intended one. Do not change global Git configuration or switch GitHub accounts implicitly.

## Work in reviewable increments

- Follow the agreed milestones. Implement a coherent slice, verify it, update documentation, then hand it to the user for a commit.
- Put relevant unit/integration tests with their feature; add E2E tests when a journey becomes testable. Do not force every test type onto every change.
- Prefer explicit, small server-side services over business rules embedded in components or a large generic framework.
- Do not introduce a dependency until it has a clear purpose. Select compatible versions and preserve the lockfile.
- Keep Arabic and English UI text in the localization structure. Make each screen responsive and handle direction correctly as it is built.
- Avoid nonfunctional feature controls and claims that unimplemented work is complete.

## Quiz integrity

- Authorize every server operation by role, ownership, and class as applicable. A hidden control is not authorization.
- Keep answer keys and grading authority on the server. Validate question/option relationships.
- Enforce one attempt per student/quiz with a database constraint and safe concurrent behavior.
- Use server time and the persisted deadline. Closing a browser or changing a client clock never extends time.
- Save/submit/expiry transitions must not allow answers to change after finalization. Submission retries return a stable result.
- Apply negative marking before flooring the final score at zero. Choose and test an explicit numeric precision policy.
- Pending local answers are not acknowledged server saves. Accept recovery only while the attempt is open; reconcile stale versions safely.

## Data and operation

- Keep import parsing separate from shared validation/persistence. Support both CSV and XLSX templates and transactional imports.
- Seed repeat-safely; do not reset application data or move deadlines on normal startup.
- Keep runtime databases, credentials, uploads, and generated artifacts out of Git. Track migrations, templates, lockfiles, and required source.
- Preserve the one-command startup contract. Do not require private cloud credentials or host Node.js for the Docker path.

## Evidence and documentation

- Update DECISIONS.md when a meaningful assumption, alternative, trade-off, or scope choice changes. Label planned verification separately from completed verification.
- Update AI_USAGE.md with actual tasks, corrections, and checks. Do not invent applicant review, tool use, test results, or rejected suggestions.
- Keep README commands and credentials accurate. While a capability is absent, say so instead of presenting an aspirational command as working.
- Use independent expected outcomes for tests. Real-database integration tests must exercise actual constraints/transactions.
- Report material limitations and the checks actually run. Do not claim untested platforms or full production readiness.

## Delivery

Reserve time for clean-checkout startup, persistence, user journeys, and documentation review. The final public repository must contain everything needed to reproduce the application. Publishing, pushing, and sending the submission are separate actions; follow the user's authorization and report only actions actually completed.
