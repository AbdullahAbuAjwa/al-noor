# Decisions and assumptions

Planning baseline: 2026-09-23. **Bootstrap, data/imports, the bilingual UI foundation, and authentication with role-based access (D23) are merged into `main`; from milestone 5 Claude Code implements at the applicant's direction (D24). Quiz authoring is in progress on `feat/quiz-authoring`: teachers can create and edit draft settings (D25). Question editing, publication, attempts, grading, and reports remain pending.** Unless a result is explicitly recorded, verification items describe intended evidence, not passing tests.

The assessment brief supplies product requirements; the applicant supplies additional preferences. Before coding, the applicant devoted substantial time to planning with ChatGPT Codex: reading the full brief, resolving ambiguity, comparing architecture and scope options, identifying misuse cases, and deciding how to test and deliver each part. He considers that planning the foundation of this project and his general engineering practice, especially with AI-assisted implementation. This record distinguishes requirements from assumptions and captures the resulting choices. Plans can change when implementation provides better evidence; record the reason rather than rewriting history to suggest the trade-off never existed.

## D01 - Stack and deployment shape

**Basis:** The brief permits any stack, requires a reason for choices outside the applicant's profile, and requires one-command startup. The applicant's strongest frontend experience is Flutter, with additional TypeScript/Node.js experience, and he explicitly prefers React/Next.js for this task.

**Decision:** Plan a single Next.js/TypeScript application with SQLite and Prisma, run as one Node application with persistent local storage. Pin compatible package versions during bootstrap.

**Why and alternatives:** Next.js combines browser UI and server endpoints in one TypeScript project. Flutter Web with Node.js remains a valid alternative and offers greater applicant familiarity. Next.js incurs React learning and review costs; it is not claimed to be inherently faster for this applicant. Keep components straightforward and business rules separately testable.

**Trade-off / revisit:** SQLite simplifies independent review without cloud accounts. It has a single-writer constraint; keep transactions short and verify contention behavior. Reconsider PostgreSQL for sustained write contention or multiple application instances. A future migration would need real schema and behavior testing, not just a connection-string change.

**Verify:** Fresh startup, actual database constraints/transactions, and applicant review of the sensitive flows.

## D02 - Reproducible startup and sample data

**Basis:** Explicit delivery requirement; the brief permits Docker Compose and SQLite.

**Decision:** `docker compose up --build` will build the application, apply migrations, initialize sample data on first use, and start the server. Store SQLite files in a named volume. Ordinary startup must not reset attempts, reseed over user changes, or move existing quiz deadlines.

**Why and alternatives:** A shared hosted database or personal configuration would make reviewers depend on external setup. Automatic first-use initialization gives each reviewer an independent sample. Docker installation and first-build network access remain documented prerequisites.

**Sample interpretation:** About 60 students across 10A/10B/11A, four teachers, and an administrator represent the pilot; 300 students and 12 teachers describe the larger center. Include Arabic/English quizzes, varying points and penalties, and synthetic report data. Set demonstration availability relative to first initialization so a new checkout is usable later.

**Verify:** Fresh tracked checkout/new volume, repeat startup without duplicates, and restart persistence. Provide an explicit reset command separately.

## D03 - Closed enrollment and role-scoped access

**Basis:** Login, teacher authoring, classes, and center oversight are in the brief. Account provisioning and authorization boundaries are assumptions agreed during planning.

**Decision:** Student, teacher, and administrator roles, with one role per account for the MVP. Students belong to one class; teachers may belong to several. Teachers own quizzes and assign them only to their authorized classes. Students see their own eligible quizzes/results; teachers see their own quizzes/results; administrators see center-wide reports.

Accounts are provisioned by seed data or an authorized import command. A small administrator user-creation form is a prioritized enhancement. There is no public signup or self-selected privileged role.

**Why / trade-off:** Existing center rosters fit controlled enrollment. This avoids inventing an enrollment/approval process, at the cost of less self-service. A separate super-administrator tier adds no needed distinction for one center.

**Verify:** Check permissions in server operations, including ownership and class membership. Test direct cross-user/cross-teacher requests, not just hidden navigation. Passwords must be hashed and sessions must support actual login/logout.

## D04 - Quiz structure and publication

**Basis:** The brief describes a typical 15-question quiz with four options per question, individual question points, and a usual duration of 20 minutes. Exactly one correct answer is an assumption.

**Decision:** Four options and one correct answer per question; positive points; configurable question count and duration. Use 15-question examples and a 20-minute default. Validate the complete draft before publication. After publication, questions, points, assignments, availability, and marking settings are fixed; create a new quiz for a changed assessment.

**Why / trade-off:** Immutability keeps students on the same rules and protects historical results without implementing quiz versioning. It limits correction of published mistakes. Editing a draft remains supported.

**Verify:** Reject empty/invalid drafts and edits to published quizzes. Ensure option/question relationships and ownership are checked server-side.

## D05 - Availability, timing, and one attempt

**Basis:** Explicit timing, availability, and no-retake requirements. Window-closing behavior is our planning interpretation.

**Decision:** Availability uses an inclusive opening and exclusive closing boundary. The attempt deadline is the earlier of its start plus duration and the quiz closing time. Persist that deadline and enforce it using server time. Store instants consistently and display center schedules in `Asia/Amman`.

Show the actual available duration before starting, including a shorter duration near closing. Starting creates the attempt. Closing a browser, refreshing, or signing back in resumes the same attempt if it is still active; none of those actions pauses time. Enforce uniqueness on student/quiz in the database, including concurrent requests.

**Why / trade-off:** A fixed closing time gives a clear assessment window. The alternative is letting anyone who starts before closing receive the full duration; our choice may give late starters less time, so the UI must disclose it.

**Verify:** Before/at/after opening and deadline, changed client clock, concurrent starts, and resume without timer reset.

## D06 - Grading and result disclosure

**Basis:** Per-question points and optional negative marking are explicit. The applicant explicitly chose a final minimum score of zero. A per-quiz percentage penalty is our interpretation.

**Decision:** Correct answers earn their question's points; wrong answers lose the configured fraction of that question's points; unanswered questions contribute zero. Default the penalty to zero. Apply the zero floor once to the final total, not to each question. Calculate grades on the server with an explicit precision policy.

Show the score out of the maximum and counts of correct, incorrect, and unanswered questions. Do not invent a pass threshold. Do not return answer keys in student question payloads or expose the answer key after submission in this MVP.

**Why / trade-off:** Quiz-level settings let teachers choose different policies without a second layer of inherited defaults. Withholding the key limits sharing during the availability window; detailed answer review is deferred.

**Verify:** Hand-calculated cases, unequal points, zero penalty, all blank, negative raw totals floored to zero, and tampered scoring inputs. Finalize numeric input limits/rounding before implementing the scorer.

## D07 - Save, submit, and expiry consistency

**Basis:** Reliability and correctness under misuse are assessment priorities; transaction semantics are an engineering decision.

**Decision:** Save selections on the server only for the authenticated owner's active attempt, valid question/option IDs, and before the server-enforced deadline. Serialize conflicting state changes with transactions and explicit mutation preconditions. Finalization stores one stable result. Repeated submission returns that result; it must not change the answers or grade.

An expired attempt is no longer editable even if no browser sent an auto-submit request. Finalize it from previously accepted answers when it is next accessed or included in a report. Reports must not label an expired attempt as still active. A background scheduler is unnecessary for the MVP's observable behavior.

**Why / trade-off:** Server-enforced expiry survives browser closure and restart. Persisted finalization may occur after the deadline, but no extra answering time is granted.

**Verify:** Save/submit races, concurrent submits, lost-response retries, foreign options, late answers, and report access to an expired attempt.

## D08 - Connection recovery and stale edits

**Basis:** The applicant requested explicit recovery behavior. Local drafts and conflict handling extend the brief to protect students against transient failures.

**Decision:** Keep the latest pending choice per question locally, scoped to the user and attempt, and retry saving while the attempt is still open. Display distinct pending, saving, saved, and failed states. Only server acknowledgment means saved. Reject answers arriving after the deadline; client-provided timestamps cannot authorize late writes.

Use server-issued mutation versions to detect conflicting/stale edits, including another tab or delayed recovery. On a genuine conflict, reconcile with current server state and explain the conflict instead of silently replacing newer answers. Define lost-acknowledgment retry behavior before implementing the queue. Clear local attempt drafts on completion or logout; handle unavailable local storage visibly.

**Why / trade-off:** This offers bounded recovery, not a fully offline examination system. Reopening the application may require connectivity. Unsynced answers may be lost if storage is cleared or time expires; the interface must communicate that limit.

**Verify:** Reconnection before/after expiry, acknowledged save with a lost response, old retries, multiple tabs, logout cleanup, and local-storage failure.

## D09 - CSV and Excel use one import contract

**Basis:** The brief asks for realistic loadable data and mentions spreadsheets. The applicant explicitly requested both CSV and XLSX rather than deferring Excel.

**Decision:** Support `.csv` and `.xlsx` with supplied templates for teachers, students, and quiz data. Format-specific readers normalize into one data structure and share validation and persistence. Document required columns, worksheet selection, identifiers, numeric fields, and duplicate handling before implementation. Names are display values, not unique identities.

Validate the whole bounded import before persisting it in a transaction. Reject invalid or duplicate/conflicting records with row/column context instead of silently replacing existing data. Keep seed repeat-safety separate from arbitrary import overwrite behavior. Import questions into drafts; publication remains a separate validated action.

**Why / trade-off:** A fixed template supports actual spreadsheet workflows without an arbitrary spreadsheet-mapping tool. Plain values are supported; legacy `.xls`, formulas, macros, and merged-cell layouts are outside the import contract. A CLI importer is core; browser upload is a later enhancement using the same services and authorization rules.

**Verify:** Equivalent CSV/XLSX inputs, Arabic, empty rows, malformed records, invalid references, duplicates, file/row limits, and no partial writes. Decide limits with realistic sample sizes and document them.

## D10 - Arabic-first, bilingual, responsive design

**Basis:** Arabic content, phone usability, and clean design are explicit. The applicant added a bilingual interface and named the product Al Noor Educational Center / مركز النور التعليمي.

**Decision:** Establish localization, language preference, RTL/LTR handling, and shared visual components early. Then deliver each screen with both interface languages and responsive behavior. Interface language does not translate teacher-authored questions. Mixed Arabic/English content needs its own direction handling.

Use a restrained teal/warm-white visual palette, consistent educational icons, readable typography, and brief interaction feedback. Selection styling must not imply answer correctness. Respect reduced-motion preferences and check actual text contrast.

**Why / trade-off:** This adds English beyond the brief but supports the applicant's requested experience and reviewer usability. Building both directions with each screen reduces later rework. Mobile and translation work are part of a feature's completion, not a cosmetic final pass.

**Verify:** Arabic/English content, long labels, phone layouts, language switching without resetting attempts, keyboard focus, contrast, and reduced motion.

**Implementation update:** Read a small `al_noor_locale` cookie on the server, defaulting to Arabic for missing or invalid values. A native POST form changes the preference and redirects to the home page; the root document and metadata use the selected language and direction. The cookie is a non-sensitive display preference, not an authentication credential. This avoids a client-only language flash and works without JavaScript. The second slice adds a shared header/footer, language switch, educational mark, and a responsive welcome layout. CSS logical properties support both directions; visible keyboard focus and a skip link aid navigation. A subtle decorative animation respects reduced-motion preferences. The page offers no controls for unfinished flows. Once nested app pages exist, preserve the current path when switching languages.

**Verification update:** The first language slice passed local and Docker checks, including three HTTP smoke checks. For the visual-shell slice, local lint/type checks and production build passed with Node.js 24. Its fresh Docker run, smoke checks, browser/phone review, keyboard focus, contrast, and reduced-motion inspection are still pending applicant verification. [Next.js cookie API](https://nextjs.org/docs/app/api-reference/functions/cookies); [response cookies](https://nextjs.org/docs/app/api-reference/functions/next-response).

**Return-path update (milestone 5):** With signed-in pages now present, the language form sends the current page as `returnTo`; the handler accepts only a local absolute path (never `//host` or `/\host`) and otherwise returns to `/`. A review of the merged milestone found that the sign-in page sent only `/login`, so switching language dropped its error message and requested page. The page now rebuilds its return path from recognized values only (a known error code, the signed-out flag, and a safe `next`), never echoing arbitrary query text. Dates render in `Asia/Amman` with Latin digits in both languages, matching scores, usernames, and codes.

**Review correction:** The applicant's Claude Code review reproduced a language failure in Docker: Next supplied the server bind address in `request.url`, so an absolute redirect sent the browser to `0.0.0.0:3000` and lost the host-scoped cookie. Use an HTTP 303 with `Location: /` so the browser retains its current host and external port. Strengthen the smoke check to require this relative location and request the destination with the issued cookie; checking only the URL path had missed the defect. The same review found that the switch button's Arabic accessible label was placed on an element marked `lang=en`, and its accessible name omitted the visible word `English`. Keep the button in the page language, put `lang`/`dir` on the visible language name, and compose its accessible name from a hidden page-language prefix plus the visible name. Local lint/type checks, production build, a direct handler check using an internal `0.0.0.0` URL, and server-rendered button-markup checks passed. The rebuilt Docker smoke run and applicant browser/screen-reader inspection remain pending.

## D11 - Risk-based tests and incremental commits

**Basis:** Automated tests, progressive commit history, and transparent AI use are explicit deliverables. The applicant says risk-based testing is part of his normal engineering practice, especially when AI helped produce code: plausible output still needs independent behavioral checks.

**Decision:** Define critical behavior before implementation. Use unit tests for bounded scoring/time rules, real-database integration tests for authorization and state transitions, HTTP/startup smoke tests for the delivered build, and E2E tests when complete journeys become available. Include negative and misuse cases for security-sensitive paths. Include relevant tests and documentation in feature commits, followed by a separate final startup/journey check.

**Why and alternatives:** Deferring tests could concentrate redesign and debugging near the deadline. Testing alongside features helps detect incorrect AI-generated behavior and regressions before a PR is merged. Different test levels cover different risks; none alone proves the application secure, so source review and explicit authorization checks remain necessary. This costs time within each milestone; we prioritize high-impact behavior rather than imposing every test type or a blanket coverage percentage on every component.

**Verify:** Test expectations derived independently from requirements, actual passing commands, and meaningful commit history. Manual review and visual checks remain necessary; do not claim tests prove correctness beyond their coverage.

## D12 - Documentation reflects evidence

**Basis:** README.md, DECISIONS.md, AI_USAGE.md, and honest disclosure are explicit requirements.

**Decision:** Update these files as work happens. Distinguish plans from implemented behavior, authored tests from executed tests, and automated checks from applicant review. Log substantive AI tasks and corrections; do not invent rejected suggestions or human review to make the history appear stronger.

**Why / trade-off:** Maintaining records takes time but lets a reviewer trace intent to behavior and evidence. Final documentation work verifies accuracy rather than reconstructing a fictional process.

## D13 - User-controlled Git and personal account

**Basis:** Explicit applicant instruction during the first implementation step.

**Decision:** The assistant may prepare files and run appropriate checks, but the applicant performs all staging, commits, and pushes. At each handoff, report what changed, what was verified, and a proposed commit subject. Work inside the applicant-requested `al-noor` project folder.

**Why / trade-off:** The applicant retains control of the repository history and publication. Personal and employer accounts coexist on the machine, so verify commit author settings separately from the credentials used by the selected Git remote/transport. An active `gh` account alone does not establish which identity a later Git push will use. Do not silently change global settings.

**Verification update:** The applicant confirmed the personal identity and subsequently initialized the repository and created the initial documentation commit. Read-only inspection found `d8db05f` and an `origin` URL under `AbdullahAbuAjwa/al-noor`. This proves the configured destination, not the identity of future Git authentication. The assistant has not staged, committed, pushed, or switched accounts.

## D14 - Bootstrap scope, build, and review checks

**Basis:** Milestone 2 requires a runnable foundation and one-command startup. The applicant requested one step at a time and chose feature branches with a later Claude review.

**Decision:** Bootstrap Next.js App Router with TypeScript strict mode, pinned direct dependencies and an npm lockfile. Use Node.js 24 LTS, matching Node types, TypeScript 5.9, and ESLint 9 with Next's matching ESLint config. TypeScript 5.9 is a conservative supported-by-the-framework choice; the build and type checks must confirm compatibility. Reject an unsupported host Node major via npm engines and document the container route independently.

**Lint compatibility finding:** npm marks ESLint 9.39.5 unsupported. Trying ESLint 10.11.0 produced peer conflicts and an actual `react/display-name` crash. The registry confirmed that the latest React, JSX accessibility, and import plugins still declare support only through ESLint 9. Retain 9.39.5 as a documented development-tool limitation; do not hide peer errors with `--force` or `--legacy-peer-deps`. Revisit ESLint 10 once the plugin chain supports it. This limitation does not remove linting from the build.

Use a multi-stage Docker build and Next's standalone output. Explicitly copy both public files and compiled static assets into the runtime image, run as the image's existing non-root `node` user, and bind the Compose host port to loopback by default. No database volume or pretend initialization script is added until the data milestone can implement and test its real behavior. Pin the base image to a Node patch tag and verified multi-platform digest so OS layers cannot silently change on the next build. Updating the image is then an explicit change. Local development uses `npm run dev`; production is served by the container's generated standalone server.

**Why / trade-off:** A production container exercises the actual distribution boundary early and requires no host Node.js or cloud credentials. Debian slim is a straightforward base for upcoming database tooling; changing to a smaller Alpine image is not worth adding native-library compatibility uncertainty now. System fonts and bundled assets avoid remote font calls during build or page rendering. The welcome page is temporary, Arabic, responsive, and explicitly says the platform is being prepared; language selection belongs to the UI milestone.

**Verification strategy:** Lint and type-check during every container build, then build for production. HTTP smoke tests check the live endpoint, page direction, and delivery of the real static assets, including assets that standalone packaging can omit. Unit tests around static text or an unconditional health response would add little evidence; quiz rules will receive unit/integration tests with their features. GitHub Actions is configured to repeat the container smoke checks on PRs and `main`, with read-only repository permissions and no publishing step. A hosted CI run and a Claude review remain unverified until they actually occur.

**Sources:** [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output), and [Node.js release support](https://nodejs.org/en/about/previous-releases). Package versions were checked against the public npm registry. Actual local checks are recorded in AI_USAGE.md.

## D15 - Automated checks on GitHub

**Context:** The brief requires reproducible startup and automated tests but does not require CI. Local checks alone do not establish that the application builds and starts on a separate machine.

**Decision and reason:** I chose to add a small GitHub Actions workflow that runs the production container build, lint/type checks, and HTTP smoke tests on pull requests and pushes to `main`. This gives each proposed change repeatable verification on a separate machine, makes failures visible during review, and supports the one-command startup requirement. Reusing the same Compose setup and smoke tests keeps local and CI verification aligned. The workflow verifies the application; it does not deploy it.

**Alternative considered:** Keep all checks manual and local. That would avoid maintaining a workflow, but would make verification depend on remembering to rerun commands and on the developer's existing environment. A small CI workflow is a proportionate addition for this assessment.

**Trade-off / evidence:** CI adds configuration to maintain and time waiting for checks. It supplements local testing and review; it does not replace them or automatically prevent a merge. The workflow file exists, but a successful hosted run remains unverified until the applicant pushes it and checks the result.

## D16 - Persistent instructions for Claude review

**Origin:** The applicant proposed using Claude Code for code review, and that workflow was discussed and agreed before `CLAUDE.md` was added. The brief welcomes such an instruction file but does not require one.

**Decision and reason:** Keep a short `CLAUDE.md` that points to the shared repository instructions and defines a read-only reviewer role. It asks Claude to include untracked files, assess the current milestone, and report concrete findings with evidence. Persistent instructions reduce repeated prompting and keep review expectations consistent.

**Trade-off / evidence:** The file must stay aligned with AGENTS.md and the agreed workflow. It guides behavior; it is not a technical permission boundary or evidence that a review happened. The applicant assesses findings, and actual review outcomes are recorded in AI_USAGE.md after review.

**Update (milestone 5):** CLAUDE.md now describes Claude Code as the implementer for the remaining milestones, keeping the same Git restrictions and reporting rules; see D24.

## D17 - Database constraints and numeric representation

**Context:** The import, quiz, and attempt services will share stored data. Uniqueness or relationship checks implemented only in application code can fail under concurrent writes or omitted validation.

**Decision:** Use Prisma 7.10.0 with the matching local SQLite adapter; avoid the Prisma 8 release candidate exposed by the registry's latest CLI tag. Model users/classes, teacher assignments, sessions, quizzes/questions/options, attempts/answers, and a seed initialization record. Stable usernames and quiz codes are unique; Arabic names remain display values. Require canonical lowercase usernames and exactly one class for a student, with no student-class field on other roles.

Enforce one attempt per student/quiz through a unique constraint. Composite foreign keys ensure an answer's question belongs to the attempt's quiz and its option belongs to that question. Store question points and final grades as integer hundredths of a point, and penalties as integer basis points (100 basis points = 1%). This avoids floating-point storage ambiguity. Bound duration to 1–180 minutes, question positions to 1–200, points to 0.01–1,000 per question, and penalties to 0–100%. These are documented MVP limits, not requirements from the brief. Final scoring/rounding behavior will be implemented and tested with grading.

**Trade-off:** Named SQL CHECK constraints supplement Prisma's schema for role values, ranges, time ordering, and complete final-result fields. Prisma schema syntax does not represent these checks: future table-rebuild migrations must preserve them, and integration tests must run the real migrations rather than `db push`. Full publication validation (including exactly four populated options), cross-record role authorization, immutable publication, and deadline/finalization enforcement remain service responsibilities; the current schema does not claim to enforce those complete workflows.

**Verification:** Real SQLite integration tests cover migration repeat-safety, persistence, foreign keys, raw invalid roles, invalid class assignment, duplicate usernames, concurrent attempts on two connections, cross-question/cross-quiz answers, bounded fields, and transaction rollback. Results are recorded in AI_USAGE.md.

## D18 - Persistent storage and migration startup

**Decision and reason:** Mount SQLite in a named Docker volume, apply only committed migrations at startup, and start the web server only if migration succeeds. The current Prisma deployment command failed on a missing SQLite file in local verification; the initialization wrapper now creates the parent directory and opens the file in append mode, creating it without truncating existing data. Tests exercise that wrapper on a new file and again after inserting records.

The server and migration CLI use the same normalized file path. Application connections explicitly enable foreign keys and WAL mode, with a bounded 5-second busy timeout; SQLite still permits only one writer. Keep a single shared Prisma client per web process and short transactions. The readiness endpoint queries a real application table and returns 503 when that fails.

**Trade-off:** Keep Prisma CLI and `tsx` in the runtime image so migrations and forthcoming seed/import commands use the same code and dependencies. This is a larger image than a minimal Next.js standalone bundle, but avoids a separate migration service or custom migration engine. Retain a non-root runtime user and verify write permissions on the named volume. Prisma Client is generated from the schema during checks/builds and is not committed.

**Verification:** The final Docker image passed lint, type checking, 15 SQLite integration tests, and the production build. Compose reached healthy status after migration; both HTTP smoke tests passed. A temporary database record survived a container restart and was then removed. A new file and repeated migration were separately covered by the integration suite.

**Sources:** [Prisma 7 SQLite](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/sqlite) and [Prisma configuration](https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference). These document the adapter/configuration; first-file behavior was verified locally rather than inferred from the documentation.

## D19 - Scoped fixes for transitive dependency advisories

**Context:** Installing Prisma 7.10.0 introduced four high-severity npm audit entries through its pinned `deepmerge-ts` and `mysql2` dependencies. The suggested automatic force-fix would downgrade Prisma across a major version. This application uses SQLite, not MySQL; Prisma configuration is trusted repository code, not request input. That limits exposure but does not remove the vulnerable packages from the shipped image.

**Decision:** Pin narrowly scoped npm overrides to `deepmerge-ts` 8.0.0 under `@prisma/config` 7.10.0 and `mysql2` 3.24.4 under Prisma 7.10.0. Review the former's major-version changes: map-merging and custom type changes do not apply to our plain Prisma configuration. Re-run real configuration loading, client generation, migrations, tests, production build, and npm audit with the overrides. Do not run `npm audit fix --force` or suppress the advisories.

**Trade-off:** These overrides step outside Prisma's pinned dependency versions and must be revisited when Prisma updates. Local and container verification cover the SQLite paths we use; they do not certify unrelated Prisma/MySQL features. Remove the overrides once upstream supplies compatible patched dependencies.

**Sources:** [Deepmerge advisory](https://github.com/advisories/GHSA-ggr8-5vv4-36mx), [version 8 changes](https://github.com/RebeccaStevens/deepmerge-ts/releases/tag/v8.0.0), [MySQL authentication advisory](https://github.com/advisories/GHSA-3f6p-5ww8-9rcr), and [MySQL compression advisory](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3). Actual verification outcomes are recorded in AI_USAGE.md.

## D20 - One-time demo initialization and public sample accounts

**Context:** A reviewer needs meaningful data from `docker compose up --build`, including accounts for each role and report examples. Ordinary restarts must preserve actual work and the quiz window already shown to students.

**Decision:** Run the demo initializer after migrations, within a single database transaction protected by a unique `SeedRun` marker. On later starts, return without rewriting records or reanchoring dates. If an unmarked database already has users, classes, quizzes, or attempts, fail with an explicit message rather than mix public demo identities into it. Provide the same repeat-safe `npm run db:seed` command for local development.

Create three pilot classes with 20 students each, four teachers with explicit class memberships, and an administrator. Give each account a salted scrypt hash; publish only documented synthetic credentials for the assessment. Seed three complete 15-question quizzes, one draft, and six finished attempts for students 02 and 03 in each class. Leave student 01 untouched so the later login/attempt walkthrough starts fresh. Seeded sample results are arithmetic examples, including 7.75/18 for a partial math attempt with a 25% wrong-answer penalty; the actual grading service remains a separate implementation step.

Set published windows from the first seed time (two hours before through 14 days after) so a newly created volume is immediately usable. Duration is 20 minutes, with the same per-question point variation and negative marking policy represented in the data. Existing volume restarts never move these dates. After 14 days, preserve historical results; a deliberate reset of the demo volume or a new quiz is needed for another fresh demonstration.

**Trade-off:** Seed data adds startup work on the first run, mainly hashing 65 individual account passwords. Hashes are computed before the write transaction to keep its lock short. Public example passwords are appropriate only for this isolated assessment sample and would require replacement before real use. CLI seeding cannot resolve arbitrary existing records automatically; refusing that ambiguous case protects data.

**Verification:** Tests use the real migration and SQLite adapter to check roster counts, credentials, role/class links, quiz windows, score examples, an unchanged repeat run, refusal/rollback on occupied unmarked storage, and the CLI command. Docker first-start and restart evidence is recorded in AI_USAGE.md.

## D21 - Bounded CSV/XLSX operator imports

**Context:** The brief requires loadable data; the applicant explicitly wanted both CSV and Excel in the core. The app does not yet have login or a browser upload flow, so granting upload access through a public route would bypass the planned role checks.

**Decision:** Provide an operator CLI that requires local filesystem/container access. Commit equivalent UTF-8 CSV and `.xlsx` templates for teachers, students, and one quiz draft; the generation script keeps both formats aligned. `csv-parse` and `read-excel-file` only normalize cells into one table shape. Shared validation checks headers, types, row bounds, identifiers, passwords, class lists, quiz metadata, contiguous question positions, four distinct options, points, and penalties. The persistence layer then checks database references and teacher/class assignment, hashing account passwords before its transaction. Imports insert new records only and fail the whole transaction on conflicts. Imported quizzes remain drafts; they are never auto-published. This is separate from repeat-safe demo seeding.

Require one XLSX sheet named `Import`. Inspect workbook archive parts before parsing to reject formulas, merged cells, macros, oversized expansion, and excessive ZIP entries. Limit input files to 2 MiB and 500 data rows; the quiz schema caps question positions at 200. Reject legacy `.xls`, arbitrary layouts, formulas, and browser upload for now. XLSX error rows count nonempty sheet rows because the selected reader omits blank rows; CSV errors use parser-reported physical lines. Document that distinction and show the offending column. The CLI never prints imported passwords.

**Review correction:** A Claude review supplied by the applicant demonstrated that an Excel cell displayed as `25%` is read as numeric `0.25` and would silently become a 0.25% penalty. The selected reader does not expose the cell's number format through this import path. Require XLSX `penalty_percent` cells to be text, including values such as `25` for 25%; reject all numeric cells in that column with a row/column error. The committed template already uses text. CSV still accepts the plain value `25` and rejects a percent sign. This stricter XLSX rule also rejects an unformatted numeric `25`, but avoids an incorrect grading rule without adding a separate style parser.

**Why / alternatives:** A fixed template and one validation path are easier to explain and test than a general column-mapping wizard. The current `ExcelJS` package would handle reading and writing together but brings a larger, older dependency chain with a moderate audit advisory. The smaller reader plus a development-only writer had zero reported advisories when checked. The extra archive preflight makes its cached-formula behavior explicit: precomputed formula results are still rejected as unsupported inputs.

**Trade-off:** The CLI is privileged by machine/container access, not in-app administrator authentication; moving imports into the UI later must add role checks before reusing the parser/service. Input passwords exist in the operator's source file and should never be committed; real credential distribution and account recovery are deferred. Database uniqueness remains the final guard for concurrent imports. The bounded format favors predictable failure over attempting to understand arbitrary spreadsheets.

**Verification:** Real-SQLite tests exercise equivalent CSV/XLSX templates, roles and teacher/class relationships, hashed passwords, stored draft questions, duplicate and unknown references, all-or-nothing rollback, quoted multiline CSV, malformed files, formula/wrong-sheet/oversized XLSX rejection, and the documented CLI. Actual local/container results are recorded in AI_USAGE.md.

## D22 - Review gates for a solo AI-assisted project

**Context:** This is the applicant's usual discipline on team projects, especially AI-assisted ones: a separate branch and PR per feature, review before merge, tests with the feature, and an automated GitHub build/check. AI-generated changes can look plausible while violating edge cases. The brief values progressive commits and clear AI use, but does not require a specific GitHub protection policy.

**Decision:** The applicant sets scope and technical direction, uses **ChatGPT Codex for implementation assistance**, and keeps each feature on its own short-lived branch with coherent commits. He then opens a PR and conducts **his own review with Claude Code as a read-only review assistant**, checks the full diff and build/test results, resolves valid findings, and decides whether to merge. Add risk-appropriate unit, integration, smoke, and later E2E tests with each feature rather than using AI review as a test substitute. The existing GitHub Actions workflow is configured to build and check PRs and pushes to `main`. Record actual review findings and corrections in AI_USAGE.md. In a team, a teammate's review can add independent judgment; in this solo assessment, Claude Code does not provide independent human approval.

**Planned repository guard:** If time permits, configure `main` to require a PR and passing CI checks and to prevent direct or force pushes. This GitHub setting is **not yet enabled or verified** here. Do not require one human approving review in a solo repository: GitHub does not let a PR author approve their own PR, so that setting would block legitimate merges without a second reviewer. Describe this as the applicant's self-review assisted by Claude Code, not as a GitHub approval or independent human review.

**Trade-off / evidence:** A branch and PR for each feature add review overhead, but make the tested diff and AI feedback inspectable before merging. Read-only Git history shows the bootstrap and data milestones merged through PR commits; it does not prove branch protection, passing hosted checks, or an independent human review. Those must be checked separately before claiming them. [GitHub review behavior](https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/reviewing-proposed-changes-in-a-pull-request); [branch rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets).

## D23 - Password sessions and server-side role access

**Basis:** The brief requires student login, teacher-entered quizzes, and centre-wide results. D03 fixes closed enrollment and three roles. Session mechanics, throttling, and redirect rules are engineering decisions.

**Decision:** Sign in with the username/password stored by the seed or importer (scrypt, D20/D21). A successful login creates a random 256-bit token sent only in an `HttpOnly`, `SameSite=Lax` cookie (`Secure` over HTTPS). The `Session` table stores a SHA-256 hash of the token, never the token. Sessions last at most 12 hours; logout deletes the row immediately, expired rows are rejected and purged, and the next login removes other expired rows. Wrong passwords and unknown usernames get the same message, and unknown usernames still run a password verification so response time does not reveal which accounts exist.

Every protected page calls a server-side role check. A signed-out request goes to `/login?next=…`; the requested path is honored after login only inside that account's own area, so the parameter cannot become an open redirect or a way into another role's pages. A signed-in user who opens another role's page is sent to their own area. Home pages show only role-scoped data: a student sees published quizzes for their own class (drafts and other classes stay hidden), a teacher sees only their own quizzes and drafts, and the administrator sees centre totals. Queries select explicit fields; password hashes never reach a page.

State-changing requests are plain HTML form posts to route handlers. They work without JavaScript, can be tested directly over HTTP, and answer with a relative 303 `Location` (the D10 lesson about Next's internal bind address). They reject a request whose `Origin` or `Sec-Fetch-Site` shows another site, including another port on the same host; `SameSite=Lax` remains the main CSRF defense. Request bodies are read with a byte limit instead of buffering arbitrary input.

**Login throttling:** After five failed attempts for one username within ten minutes, that username is refused for 60 seconds, even with the correct password. The counter is kept in the server process and resets on success, after its window, or on restart.

**Why / alternatives:** An authentication library (the route Next.js documentation recommends) would still need the same credential, session, and role decisions for a closed username/password roster, plus configuration and dependencies to review; the small explicit implementation is easier to test and explain here. Stateless signed tokens were rejected because logout could not revoke them without a server-side list. Server Actions provide a built-in origin check, but route handlers keep the forms, tests, and redirects explicit and consistent. The `forbidden()` helper was not used because it is still experimental in this Next.js version.

**Known gap (from review):** Because the limit is per username, a flood of attempts with ever-different usernames still reaches the costly password check on every request. Capping concurrent password checks, or rate limiting at a trusted proxy, is the planned mitigation; it is not implemented, and its practical exposure is limited while Compose publishes the port on the local machine only.

**Trade-off / risk:** Throttling by username means a classmate who knows another student's username could repeatedly delay that student's sign-in by up to a minute at a time. Keying by client address would be unreliable because Docker publishing and proxies hide it, and forwarded headers can be forged without a trusted proxy. A real deployment would add rate limiting at a trusted proxy, monitoring, and account recovery. There is no password change, recovery, or account management UI in the core (D03).

**Verification:** Real-SQLite tests cover login for all three roles, hashed token storage, username normalization, generic failures, oversized input, throttling (lock, other accounts unaffected, expiry, reset on success, window expiry), session expiry at the exact boundary, forged/malformed tokens, logout of one session only, and expired-session purging. Unit tests cover safe local paths, role-bounded post-login paths, availability boundaries, cross-site request detection (including another localhost port and forwarded host), bounded form reading (including a body with no length header), and relative redirects. Role-scoped query tests cover class/owner filtering and centre totals. HTTP smoke tests against the production container cover relative redirects for signed-out users, Arabic login page, failed and cross-site logins, each role's own page and data, refusal of other roles' pages, sign-out, and reuse of a signed-out cookie. Results are in AI_USAGE.md.

## D24 - Claude Code moves from review to implementation

**Context:** Through milestone 4, ChatGPT Codex implemented changes and the applicant used Claude Code for read-only PR review (D16, D22). For milestone 5 onward, the applicant directed Claude Code to implement the remaining core milestones under the same Git ownership rules.

**Decision:** Claude Code implements each feature on its own branch starting from the merged `main`, adds tests with the feature, runs the available checks and the Docker startup, updates README/DECISIONS/AI_USAGE while working, and hands off with a proposed commit. The applicant alone stages, commits, pushes, and opens or merges PRs, and performs the visual/browser checks. CLAUDE.md now describes this implementer role instead of the read-only reviewer role.

**Trade-off / evidence:** The earlier separation between the implementing tool and the reviewing tool no longer holds for these milestones. Claude Code's checks of code it wrote are self-verification, not independent review, and no second AI review is claimed unless one actually occurs. The mitigations are tests whose expected values come from the brief, the seed data, and hand calculation rather than from the implementation; HTTP checks against the production container; and the applicant's own review and interface checks before merging.

## D25 - Teacher quiz drafts in the browser

**Basis:** "Our teachers will put the quizzes in" (brief). D04 fixes the draft/publish model; the CSV/XLSX importer (D21) already creates drafts from spreadsheets.

**Decision:** A teacher creates a draft from **New quiz** with a title, one or more classes, a duration (1–180 minutes, default 20), and a wrong-answer penalty as a percentage of each question's points (0–100, up to two decimals, stored as basis points). Only classes the teacher teaches are offered, and the server re-checks every submitted class against the teacher's assignments, so an edited form cannot assign another class. New drafts get a generated code (`quiz-` plus eight random characters) in the same format the importer accepts. Drafts, including imported ones, open in an editor where the owner can change these settings; a published quiz opens read-only (D04).

The service checks ownership and draft status inside one transaction. The edit is a conditional update (`id`, owner, `DRAFT`) that runs first, so a quiz published at the same moment cannot be edited afterwards, and a rejected class list rolls the whole edit back. Another teacher's quiz returns 404, exactly like a missing one, for both the page and the form post; a student gets 403 from the form endpoints; a signed-out post is sent to sign-in. Forms are plain HTML posts, like sign-in (D23), with browser-side limits for convenience and the same checks on the server.

**Trade-off:** After a validation error the form shows the message but reloads saved values, so a teacher retypes the rejected field; browser-side limits make this rare. Deleting a draft is not offered in the core.

**Verification:** Real-SQLite tests cover accepted boundaries and each invalid field, drafts hidden from students, untaught and mixed class lists (no write), owner edits including class replacement, another teacher's quiz (unchanged, not found), a published quiz (unchanged, locked), and full rollback when one class is not taught. HTTP smoke checks cover the offered classes, 404 for another teacher, 403 for a student, sign-in redirect, a locked published quiz, and an untaught class; with `SMOKE_WRITES=1` (CI) they also create and edit a draft.

## Scope beyond the brief

English interface selection, an explicit administrator role, draft/publication workflow, answer autosave/recovery, and repeat-safe requests are planned additions or interpretations. Their reasons and costs are recorded above. An administrator creation form and browser spreadsheet upload remain prioritized enhancements, not implemented features.

GitHub CI and persistent Claude review instructions are delivery-workflow additions; their distinct origins and trade-offs are recorded in D15 and D16.

## Deliberately omitted from the core

- Public registration, email verification, and email-based password recovery: closed center enrollment and no external account dependencies.
- Proctoring, camera monitoring, and automatic cheating claims: not needed to enforce quiz integrity.
- AI features inside the product, microservices, cloud infrastructure, and multi-center tenancy: outside the tutoring workflow and timebox.
- Detailed answer-key review, question-bank/versioning systems, and invented pass/fail criteria: beyond the specified score/report requirement.
- Fully offline operation, unrestricted spreadsheet layouts, legacy `.xls`, and formula evaluation: explicitly bounded input/recovery contracts.
- Public hosting as a prerequisite: a local reproducible repository is the required delivery; a hosted demo is optional.

## Unfinished work

Merged into `main`: bootstrap, data/imports, the bilingual UI foundation, and sign-in with role-scoped home pages. On `feat/quiz-authoring`, teachers can create drafts and edit their settings. Question editing in the browser, publication with an availability window, taking a timed quiz, autosave, grading, detailed results/reports, and browser uploads remain unfinished, as does the password-check cap noted in D23. `main` protection, hosted CI results, and applicant visual checks of the newest pages have not been verified here. See [PLAN.md](PLAN.md) and AI_USAGE.md for actual executed checks.

## If another week were available

Prioritize findings from reviewer/user testing, then finish administrator provisioning and browser imports if absent. Improve account recovery, accessibility and device coverage, and question correction/versioning. Measure realistic simultaneous quiz activity before changing the database or deployment model. Establish backup/restore and operating procedures before real center use.
