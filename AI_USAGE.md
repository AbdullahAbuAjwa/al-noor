# AI usage record

This is a factual work log, not a claim that every planned feature or verification has been completed. Update it alongside implementation.

## Tools actually used in this repository's work

- **ChatGPT Codex (desktop):** implementation assistance under the applicant's direction, including requirements analysis, architecture discussion, test planning, documentation, application bootstrap, database foundations, demo data, operator imports, and the bilingual UI foundation.
- **Claude Code, directed by the applicant:** assists the applicant's own read-only PR review. The applicant reported a clean bootstrap review and later supplied one concrete XLSX percentage finding; the full review transcripts were not provided to Codex.
- **Read-only supporting tools:** PDF text extraction and page rendering, inspection of the supplied email screenshots, official web documentation, and local directory/Git inspection.

The applicant owns scope, technical decisions, validation, Git history, and merge decisions. The intended sequence is a feature branch and coherent commits, Codex-assisted implementation, tests appropriate to that feature, a PR and applicant review assisted by Claude Code, CI checks, then a human merge decision. This is also the team-project workflow the applicant says he normally follows; this solo assessment has no independent teammate approval. Entries below distinguish completed steps from planned ones. No exact model identifier or percentage of AI-written code is asserted.

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

**Work performed:** This was a substantial discussion phase before application code. The assistant extracted text from all three PDF pages and visually reviewed their renders, reviewed the supplied email screenshots, and consulted official framework/tool documentation. It proposed role boundaries, timing rules, scoring, import behavior, sample data, tests, and milestones. The applicant challenged and refined those proposals, chose the scope and technology, and requested a phased plan with explicit decisions and edge cases. That plan guided the later implementation rather than being written after the code. No exact planning duration was recorded.

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

**Starting evidence:** Read-only inspection found a clean `main` with the bootstrap merge `a2550d8`. The applicant reported Claude's bootstrap review complete with no changes requested. The assistant proposed `feat/data-imports` and prepared the first commit-sized part before demo data and imports.

**Work performed:** Added a pinned stable Prisma/SQLite adapter, schema and migration with database CHECK constraints and composite foreign keys, a shared connection factory, startup migrations and persistent Docker volume, database readiness, and 15 real-database integration tests. Updated the container/CI build to run those tests and documented decisions D17–D18. This implements stored-data constraints, not authorization or complete quiz behavior.

**Corrections from actual checks:** A missing SQLite file caused Prisma's migration deployment to fail with a generic schema-engine error, including outside the shell sandbox. A controlled comparison succeeded when an empty file already existed. The startup wrapper now creates the file without truncation; repeat-migration tests protect existing records. Invoking the `tsx` CLI hit a sandbox IPC restriction, so the scripts use Node's `--import tsx` loader without that unnecessary IPC listener. A Vitest config module-format warning was resolved by using an explicit `.mts` config file.

**Dependency review:** npm audit initially reported four high-severity entries through Prisma's pinned config/MySQL packages. The assistant checked the advisories, reviewed Deepmerge 8's breaking changes and Prisma's actual configuration-loading call, then added scoped overrides (D19) instead of accepting an automatic major downgrade. Installation with the overrides reported zero vulnerabilities. Local lint/type checks, all 15 integration tests, and the production build passed with the patched dependencies.

**Verification:** Prisma schema validation/generation, local lint/type checks, all 15 SQLite integration tests, and the production build passed with the final dependencies. The tests apply the actual migration to isolated temporary files and clean up only their own fixtures. The final Docker image repeated lint/type/build and all 15 tests. Compose became healthy after migrations; two HTTP smoke tests passed. A temporary database record survived a container restart, and the assistant removed that record afterward. A final npm audit reported zero vulnerabilities. These checks establish the database foundation and startup path, not the unfinished login/quiz/import flows. Hosted CI and visual behavior remain unverified here.

**Scope boundary:** Sample accounts, seed idempotency, CSV/XLSX parsers/templates, and import transactions are the next two parts. No browser inspection, hosted CI run, or Claude review of this database change has been performed by this assistant. No staging, commit, push, or branch change has been performed.

### Session 05 - Repeat-safe demo data (second part of milestone 3)

**Task given to AI:** Implement the next step after the applicant created `566f53e` on `feat/data-imports`. The applicant continues to own staging and commits.

**Work performed:** Added a transactional first-use initializer for 60 students, four teachers, one administrator, three published 15-question quizzes, one draft, and six synthetic finished attempts. Added reusable scrypt hashing/verification for the later login service, demo fixtures with varied points and one negative-marking example, a local seed command, automatic Docker startup seeding, and matching README credentials and decision D20.

**Verification:** Local lint/type checks and all 19 SQLite tests passed, including four new seed tests. The original test command was accidentally split across shell environment scopes: `npm run check` used the bundled Node 24, while `npm test` initially picked system Node 18 and Prisma refused to start. Rerunning the test with Node 24 active passed. The final Docker image repeated lint/type checks, all 19 tests, and the production build. Compose initialized demo data before the server started and became healthy; its database held 65 users, three classes, four quizzes, and six finished attempts. After a container restart, the seed timestamp, quiz closing timestamp, and record counts were unchanged, and startup reported that existing records were preserved. Both HTTP smoke tests passed. No UI, login, hosted CI, or CSV/XLSX behavior is claimed.

### Session 06 - CSV/XLSX operator imports (third part of milestone 3)

**Task given to AI:** Implement the next step after the applicant committed the demo-data slice as `0695dbe` on `feat/data-imports`.

**Work performed:** Added equivalent teachers/students/quiz templates in both formats, a reproducible template generator, a CLI importer, shared validation, role/class checks, and transactional persistence. Imported quizzes are drafts. Account passwords are hashed before writing. The reader bounds files and workbook expansion and rejects formula, macro, and merged-cell XLSX content. Updated the Docker runtime to include templates and documented the command and input contract in README and D21.

**Tool and correction notes:** Checked current package metadata and official CSV/XLSX documentation. A trial dependency audit found a moderate transitive advisory in the larger `ExcelJS` option; the selected smaller reader, development-only writer, parser, and ZIP helper had zero reported advisories during installation. The first local lint pass caught an unused test import, which was removed. Tests exposed no database rollback failure. An additional review found that the XLSX reader trims strings by default, which could silently change an imported password; the parser now asks it to preserve raw strings before validation.

**Verification actually performed:** After the string-preservation and XML-decoding adjustments, local lint/type checks, all 29 tests (10 for imports), and the production build passed. The final Docker build repeated lint/type checking, all 29 tests, and the production build; Compose reached healthy status. In a disposable container with an isolated temporary SQLite database, migrations and seed ran, then the documented CLI imported one teacher from CSV, one student from XLSX, and three quiz questions into a draft from XLSX. Both HTTP smoke tests passed against the running container. A final npm audit reported zero vulnerabilities. The import tests cover equivalent CSV/XLSX writes, rollback, invalid references/quiz rows, quoted multiline CSV, malformed/unsupported workbook inputs, and the CLI. Hosted CI, browser UI, and Claude review of this change remain unverified. The assistant did not stage, commit, push, or change branches.

### Session 07 - Claude review follow-up: Excel percentages

**Input and decision:** The applicant relayed a concrete Claude review finding: Excel stores a cell displayed as `25%` as numeric `0.25`, which the importer would treat as a 0.25% negative-marking penalty. The assistant did not receive the full Claude review transcript. To prevent a silent grading-rule change, the XLSX importer now requires text in `penalty_percent` and rejects numeric cells with a row/column error. This is stricter than rejecting only fractions because percentage-formatted cells can contain other numeric values too. CSV behavior and the existing text-cell XLSX template stay the same. README and D21 explain the trade-off.

**Verification actually performed:** A new regression test builds a workbook with every quiz row's penalty cell displayed as `25%` and stored as numeric `0.25`, with the referenced teacher present; it asserts rejection and no new quiz. It also checks that a plain numeric `25` is rejected. Existing XLSX-template tests still import text `25` as `penaltyBps = 2500`. After strengthening that test, local lint/type checks and all 30 tests passed. The parser change passed a Docker build with lint/type checks, 30 tests, and a production build; the container became healthy and both HTTP smoke tests passed. The Docker build's regression-test snapshot preceded the final strengthening of that test, while the full local suite used the final test. No staging, commit, push, or branch change was performed by the assistant.

### Session 08 - Bilingual foundation, first commit-sized part

**Task and applicant direction:** The applicant reported the data/import PR merged into `main` and created `feat/bilingual-ui-foundation`. He asked to start the next feature and to document the review guards he follows on AI-assisted work: a feature branch, PR, diff review, CI checks, and a read-only Claude review. Protecting `main` is intended if time permits, not yet claimed as enabled. The applicant retains all staging, commits, pushes, PR, and merge actions.

**Work performed:** Added server-rendered Arabic-default locale selection, a native POST language form, a persistent `al_noor_locale` cookie, and matching document direction and metadata. Invalid locale values fall back to Arabic. Updated the HTTP smoke suite to exercise the actual route, cookie, English page, and invalid-value rejection. Updated PLAN/README and decisions D10/D22. The responsive visual shell remains the second part of this feature branch.

**Review interpretation:** Official Next.js cookie/response documentation was checked for the server API. Official GitHub documentation confirms that a PR author cannot approve their own PR. The applicant's PR diff inspection is therefore documented as self-review, and Claude feedback as AI-assisted review; neither is represented as independent human approval. CI exists, but `main` protection and a passing hosted run were not verified in this turn.

**Verification actually performed:** Local lint/type checks and the production build passed. The Docker build repeated lint/type checks, all 30 existing tests, and the production build; Compose reached healthy status. Three HTTP smoke checks passed on the running container, including Arabic default, English cookie persistence with `lang=en`/`dir=ltr` and English title, and fallback for an invalid cookie. The applicant requested ownership of visual/browser inspection, so no phone layout or visual quality is claimed yet. No staging, commit, push, or branch change was performed by the assistant.

### Session 09 - Applicant clarification of review and testing practice

**Applicant clarification:** The intended process is the applicant's **own review assisted by Claude Code**, not a separate approver. He also stated that he uses different kinds of tests across his projects as an engineering safety check, especially for AI-assisted code. The assistant updated D11/D22, PLAN, and README to say this plainly and to keep security claims proportionate: tests can catch regressions and misuse cases, but do not prove the whole system secure. This project currently has real-database integration tests and production HTTP smoke checks; unit tests for scoring/time rules and complete-journey E2E tests remain planned for their features. This turn changed documentation only; no new test run or Claude review is claimed.

### Session 10 - Applicant clarification of AI tool roles

**Applicant clarification:** He wants evaluators to see the actual collaboration pattern: **ChatGPT Codex helps implement**, while **Claude Code helps him review** each feature PR. The applicant sets direction and evaluates both tools' output. He described separate feature PRs, review, tests with each feature, and a GitHub build/check as his normal team-project practice, especially for AI-assisted work. The assistant made those roles prominent in README, D22, PLAN, and this record. This is a documentation clarification, not a claim that the current bilingual PR has already received Claude review or passed hosted CI. No code or tests changed in this turn.

### Session 11 - Applicant clarification of planning's role

**Applicant clarification:** He emphasized that planning with ChatGPT Codex took substantial time before implementation and is foundational to this project and his usual approach to software work. The assistant made the planning phase prominent in README, PLAN, and DECISIONS and expanded Session 01 to show the topics and the applicant's decisions. No exact hours were measured, and the documentation does not claim the initial plan predicted every implementation detail. This turn changed documentation only; no code, tests, commits, or external settings changed.

### Session 12 - Responsive visual shell, second bilingual commit-sized part

**Applicant direction:** Implement the next step on `feat/bilingual-ui-foundation`. Keep the implementation solid but let the applicant run the Docker and browser checks himself to conserve interaction time. The applicant still owns staging, commits, pushes, and visual inspection.

**Work performed:** ChatGPT Codex extracted the existing language form into a reusable component and added a shared header/footer and responsive welcome layout using the existing book mark. It added Arabic and English copy, logical CSS properties for both directions, a keyboard skip link and visible focus, and restrained decorative motion disabled by reduced-motion settings. No buttons were added for unfinished quiz or login flows. README, PLAN, and D10 were updated while implementing.

**Verification actually performed:** The first local lint run found a Next.js rule against a plain home-page anchor; the assistant changed it to Next's Link. The first type check used the host's Node.js 18 and failed because Prisma requires Node.js 24; rerunning the full lint/type check with the project's Node.js 24 passed. A subsequent Git status inspection exposed that an attempted CSS patch had not changed the file despite the editing tool returning without an error. The assistant rewrote the stylesheet, confirmed it appeared in the diff and compiled CSS asset, and reran the production build successfully with Node.js 24. Docker startup, HTTP smoke checks, phone/desktop appearance, keyboard behavior, contrast, and reduced-motion behavior remain for the applicant to check. No Claude review of this slice or hosted CI result is claimed. The assistant did not stage, commit, push, or merge.

### Session 13 - Applicant's Claude Code review: redirect and accessible name

**Review input:** The applicant supplied two concrete Claude Code findings. Claude reproduced a language-switch failure in a running Docker container: the redirect used Next's internal `0.0.0.0:3000` URL, while the browser cookie belonged to `localhost`. It also inspected the generated HTML and found a mixed-language accessible label and a visible name absent from the button's accessible name. Codex received the findings, not the full review transcript; the Docker reproduction is attributed to the applicant's Claude-assisted review, not to a Codex-run check.

**Decision and correction:** Codex changed the response to a relative HTTP 303 `Location: /`, preserving the browser's host and published port. The HTTP smoke assertion now checks the complete `Location` header and requests that destination with the issued cookie, instead of checking only the path. The switch button now inherits the page language; a visually hidden prefix in that language and a visible language name with its own `lang`/`dir` compose an accessible name containing the visible text. The applicant evaluates and accepts the review findings; Codex implements the correction.

**Verification actually performed:** Local lint/type checks and production build passed with Node.js 24 after the fix. A direct route-handler check used a request URL at `http://0.0.0.0:3000` and observed `Location: /` plus the locale cookie. Server-rendered button markup was checked for both languages: the visible name has the target language, and the button has no overriding `aria-label`. The rebuilt Docker HTTP smoke run and browser/assistive-technology inspection are pending applicant verification. No hosted CI pass, Claude re-review, staging, commit, push, or merge is claimed for this correction.

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
