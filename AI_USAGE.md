# AI usage record

This is a factual work log, not a claim that every planned feature or verification has been completed. Update it alongside implementation.

## Tools actually used in this repository's work

- **Codex desktop assistant:** requirements analysis, architecture discussion, test planning, documentation, application bootstrap, and database foundations.
- **Read-only supporting tools:** PDF text extraction and page rendering, inspection of the supplied email screenshots, official web documentation, and local directory/Git inspection.

The applicant chose Claude Code for feature reviews and reported that the bootstrap review completed with no changes requested. Codex has not inspected that review transcript. No exact model identifier or percentage of AI-written code is asserted.

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

**Handoff status at that time:** Documentation was prepared for applicant review and a user-created commit. No Git repository had been initialized, and the assistant had not staged, committed, or pushed anything. No application tests had run because there was no application code yet.

### Session 03 - Application bootstrap

**Task given to AI:** Implement only the next bootstrap milestone on the applicant-created `chore/bootstrap` branch, communicate briefly, and leave staging, commits, and pushes to the applicant.

**Starting state:** Read-only Git inspection found a clean `chore/bootstrap` branch and the applicant's initial documentation commit (`d8db05f`). The configured remote points to the personal repository. The system Node.js was 18.15.0; the assistant selected the separately bundled Node.js 24.19.0 for local checks without changing the machine's global Node setup. Docker Desktop was installed but not running and was started for verification.

**Work performed:** Created a minimal Next.js/React/TypeScript application, shared copy dictionaries for the temporary Arabic page, local branding, explicit lint/type-check commands, a production Dockerfile, Compose health check, and live HTTP smoke tests. Added a GitHub Actions workflow to exercise the same container boundary and CLAUDE.md instructions for the applicant's chosen read-only review workflow. Updated setup instructions and decision D14, and corrected the plan's stale pre-commit status.

**Applicant decision:** The assistant proposed and implemented a small CI workflow during bootstrap. After discussing its behavior, purpose, and GitHub Actions billing, the applicant adopted CI as a project decision and requested that its engineering rationale and trade-offs be documented. D15 records that decision; D16 records the agreed Claude review workflow. Creating either file is not evidence of a hosted CI run or a completed Claude review.

**Scope control:** No authentication, database, seed, imports, quiz features, or language selector were implemented. Those remain separate milestones. The smoke checks target startup and asset packaging; they do not establish quiz correctness, accessibility, or authorization.

**Correction from tool evidence:** An ESLint 9 support warning prompted a trial upgrade to ESLint 10. The trial failed with incompatible plugin peer ranges and an actual React lint-rule exception. The assistant checked current plugin metadata and restored the compatible ESLint 9 version, recording the support limitation rather than bypassing peer validation. No applicant or Claude finding is being attributed to this correction.

**Verification actually performed:**

- `npm run check`: ESLint and generated-route TypeScript checks passed locally using Node.js 24.19.0.
- `docker compose config --quiet`: configuration parsed successfully.
- `docker compose up --build --detach --wait --wait-timeout 120`: built and started a new application container, including `npm ci`, lint/type checks, and the production Next.js build. The container became healthy. This exercised Linux ARM64 through Docker Desktop, with no existing app container or host dependency/build directories copied into the image. It was not a post-commit fresh-checkout test.
- `npm run test:smoke`: both HTTP checks passed against the running production container (uncached health response, Arabic page, and public/compiled assets).
- `docker compose exec -T app id` and `node --version`: confirmed non-root UID 1000 and Node.js 24.19.0.
- `npm audit --audit-level=high`: reported zero known vulnerabilities at the time of the check; this is not a security guarantee.
- Package/lock consistency, workflow YAML, Markdown links/fences, and `git diff --check` passed. The first auxiliary documentation-check attempt could not load Python's optional YAML module; the check was rerun successfully using the already installed JavaScript YAML parser, without adding a dependency.

**Remaining verification and handoff:** The applicant requested ownership of opening the app and checking its interface. No successful browser or phone visual inspection is claimed. No Claude review, hosted CI run, or applicant code review has been claimed. The application was left running at `http://localhost:3000` for the applicant. The assistant has not staged, committed, or pushed any change.

### Session 04 - Database foundation (first part of milestone 3)

**Task given to AI:** Start the database/demo/import milestone, using multiple meaningful commits within one PR, with the applicant retaining all staging, commits, and pushes.

**Starting evidence:** Read-only inspection found a clean `main` with the bootstrap merge `a2550d8`. The applicant reported Claude's bootstrap review complete with no changes requested. The assistant proposed `feat/data-imports` and is preparing only the first commit-sized part before demo data and imports.

**Work performed:** Added a pinned stable Prisma/SQLite adapter, schema and migration with database CHECK constraints and composite foreign keys, a shared connection factory, startup migrations and persistent Docker volume, database readiness, and 15 real-database integration tests. Updated the container/CI build to run those tests and documented decisions D17–D18. This implements stored-data constraints, not authorization or complete quiz behavior.

**Corrections from actual checks:** A missing SQLite file caused Prisma's migration deployment to fail with a generic schema-engine error, including outside the shell sandbox. A controlled comparison succeeded when an empty file already existed. The startup wrapper now creates the file without truncation; repeat-migration tests protect existing records. Invoking the `tsx` CLI hit a sandbox IPC restriction, so the scripts use Node's `--import tsx` loader without that unnecessary IPC listener. A Vitest config module-format warning was resolved by using an explicit `.mts` config file.

**Dependency review:** npm audit initially reported four high-severity entries through Prisma's pinned config/MySQL packages. The assistant checked the advisories, reviewed Deepmerge 8's breaking changes and Prisma's actual configuration-loading call, then added scoped overrides (D19) instead of accepting an automatic major downgrade. Installation with the overrides reported zero vulnerabilities. Local lint/type checks, all 15 integration tests, and the production build passed with the patched dependencies.

**Verification:** Prisma schema validation/generation, local lint/type checks, all 15 SQLite integration tests, and the production build passed with the final dependencies. The tests apply the actual migration to isolated temporary files and clean up only their own fixtures. The final Docker image repeated lint/type/build and all 15 tests. Compose became healthy after migrations; two HTTP smoke tests passed. A temporary database record survived a container restart, and the assistant removed that record afterward. A final npm audit reported zero vulnerabilities. These checks establish the database foundation and startup path, not the unfinished login/quiz/import flows. Hosted CI and visual behavior remain unverified here.

**Scope boundary:** Sample accounts, seed idempotency, CSV/XLSX parsers/templates, and import transactions are the next two parts. No browser inspection, hosted CI run, or Claude review of this database change has been performed by this assistant. No staging, commit, push, or branch change has been performed.

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
