# AI usage record

This is a factual work log, not a claim that every planned feature or verification has been completed. Update it alongside implementation.

## Tools actually used in this repository's work

- **Codex desktop assistant:** requirements analysis, architecture discussion, test planning, and the initial documentation draft.
- **Read-only supporting tools:** PDF text extraction and page rendering, inspection of the supplied email screenshots, official web documentation, and local directory/Git inspection.

The applicant mentioned prior use of Claude Code on other work. **Claude Code has not been used for this repository so far.** No exact model identifier or percentage of AI-written code is asserted. Application code has not yet been written.

## Applicant direction

The applicant asked the assistant to read the complete three-page brief before proposing implementation, keep the initial work discussion-only, use phased commits, write documentation during development, and prioritize correctness and explainable decisions.

The applicant's explicit choices and corrections included:

- Prefer React/Next.js despite stronger Flutter frontend experience; justify the trade-off honestly.
- Clamp the final score to zero after applying negative marking.
- Support both CSV and Excel rather than deferring XLSX.
- Build each screen responsively from the start.
- Use Arabic by default with selectable English and a consistent, restrained educational design.
- Name the application **مركز النور التعليمي / Al Noor Educational Center**.
- Add the appropriate tests with each feature instead of postponing all tests or requiring all test types everywhere.

These are observed planning contributions. They do not imply the applicant has reviewed implementation code that does not yet exist.

## Work log

### Session 01 - Requirements and planning

**Task given to AI:** Read and explain the assessment, identify gaps, propose an achievable architecture, and discuss scope before writing the application. This is a paraphrase of the conversation, not a verbatim prompt transcript.

**Work performed:** The assistant extracted text from all three PDF pages and visually reviewed their renders, reviewed the supplied email screenshots, and consulted official framework/tool documentation. It proposed role boundaries, timing rules, scoring, import behavior, sample data, tests, and milestones. The applicant reviewed the proposal and supplied the choices listed above.

**Corrections and limitations:**

- The assistant initially proposed deferring XLSX; the applicant requested both formats and the plan changed to shared normalization/validation with separate readers.
- The phrase "availability window" was initially confused with a browser window. The assistant clarified that closing a tab does not cancel an attempt or pause its timer.
- The assistant unnecessarily reopened parts of question structure already in the brief. The record now separates the explicit four-option/typical 15-question description from the single-correct-answer assumption.
- Some public portfolio pages could not be inspected meaningfully. No source-code review of those projects was performed or used as evidence of this application's quality.

**Verification performed:** Complete PDF extraction and visual review; direct comparison of the plan with the brief; technical claims checked against official documentation. No application behavior, security property, or automated test has been verified at this stage.

### Session 02 - Initial repository documentation

**Task given to AI:** Start the first agreed step in the existing project folder.

**Work performed:** The assistant inspected the folder, found the supplied brief and no Git repository or applicable AGENTS.md, and drafted README.md, PLAN.md, DECISIONS.md, AI_USAGE.md, AGENTS.md, and .gitignore. Files explicitly distinguish planned work from runnable behavior. At the applicant's direction, those new files were moved into the `al-noor` child folder and the brief was left unchanged in the parent.

**Applicant correction:** The applicant reserved all staging, commits, and pushes for himself and required use of his personal account rather than his employer's account. The assistant recorded this restriction and performed only read-only Git identity/account inspection. The inspection showed two GitHub CLI accounts and a company-associated active account; authentication checks returned errors, so effective remote identity remains unverified. No account switch, Git configuration change, repository initialization, staging, commit, or push was performed.

**Identity confirmation:** The applicant confirmed which GitHub account and commit email are personal. This establishes the intended identity; it does not verify a working remote login or change the active account.

**Verification performed:** A read-only Python check passed for the six expected project files, eight local Markdown links/anchors, UTF-8 readability, balanced code fences, explicit not-yet-runnable status, Git ownership restrictions, confirmed intended identity, and the project/brief locations. An initial overly strict parent-folder inventory assertion failed on macOS `.DS_Store`; excluding that OS metadata made the location check accurate. The assistant also reread the current plan, README, AI log, and agent instructions for consistency.

**Handoff status:** Documentation is prepared for applicant review and a user-created commit. No Git repository has been initialized, and the assistant has not staged, committed, or pushed anything. No application tests have run because there is no application code yet.

## Implementation workflow

For each substantial feature, record:

1. What the applicant requested and the constraints given to the assistant.
2. What the assistant generated or changed and what was accepted, corrected, or discarded.
3. How expected behavior was determined independently of the generated implementation.
4. The actual checks executed and their results; mention any untested behavior.
5. Which review was performed by the applicant and which by the assistant/tools.

For grading and timing, use manually reasoned examples. For authorization and attempt consistency, test the real request/service/database behavior. Run a fresh startup independently of the development workspace before delivery. An assistant-generated test is not by itself evidence that the specification was interpreted correctly.

## Selected technical references consulted

- [Next.js testing guidance](https://nextjs.org/docs/app/guides/testing)
- [Next.js authentication guidance](https://nextjs.org/docs/app/guides/authentication)
- [Next.js internationalization guidance](https://nextjs.org/docs/app/guides/internationalization)
- [SQLite deployment suitability and concurrency trade-offs](https://www.sqlite.org/whentouse.html)
- [Docker Compose quickstart](https://docs.docker.com/compose/gettingstarted/)
- [OWASP authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [Browser connectivity limitations](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine)

These informed the plan; consulting them is not a substitute for verifying the delivered application.
