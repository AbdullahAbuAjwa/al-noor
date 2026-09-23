# Decisions and assumptions

Planning baseline: 2026-09-23. **Implementation is pending.** The verification items below describe intended evidence, not passing tests.

The assessment brief supplies product requirements; the applicant supplies additional preferences. This record distinguishes those from engineering assumptions. Accepted plans can change when implementation provides better evidence; record the reason rather than rewriting history to suggest the trade-off never existed.

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

## D11 - Risk-based tests and incremental commits

**Basis:** Automated tests, progressive commit history, and transparent AI use are explicit deliverables. The applicant agreed to tests alongside features.

**Decision:** Define critical behavior before implementation. Prefer tests first for clear scoring/time rules; add real-database integration tests for authorization and state transitions. Add E2E tests as complete journeys become available. Include relevant tests and documentation in feature commits, followed by an independent final startup/journey check.

**Why and alternatives:** Deferring tests could concentrate redesign and debugging near the deadline. Testing alongside features gives earlier feedback and regression protection while reviewing AI-generated changes. It costs time within each milestone; we prioritize high-impact behavior rather than imposing every test type or a blanket coverage percentage on every component.

**Verify:** Test expectations derived independently from requirements, actual passing commands, and meaningful commit history. Manual review and visual checks remain necessary; do not claim tests prove correctness beyond their coverage.

## D12 - Documentation reflects evidence

**Basis:** README.md, DECISIONS.md, AI_USAGE.md, and honest disclosure are explicit requirements.

**Decision:** Update these files as work happens. Distinguish plans from implemented behavior, authored tests from executed tests, and automated checks from applicant review. Log substantive AI tasks and corrections; do not invent rejected suggestions or human review to make the history appear stronger.

**Why / trade-off:** Maintaining records takes time but lets a reviewer trace intent to behavior and evidence. Final documentation work verifies accuracy rather than reconstructing a fictional process.

## D13 - User-controlled Git and personal account

**Basis:** Explicit applicant instruction during the first implementation step.

**Decision:** The assistant may prepare files and run appropriate checks, but the applicant performs all staging, commits, and pushes. At each handoff, report what changed, what was verified, and a proposed commit subject. Work inside the applicant-requested `al-noor` project folder.

**Why / trade-off:** The applicant retains control of the repository history and publication. Personal and employer accounts coexist on the machine, so verify commit author settings separately from the credentials used by the selected Git remote/transport. An active `gh` account alone does not establish which identity a later Git push will use. Do not silently change global settings.

**Verify:** The applicant confirmed the personal GitHub account and author email in the discussion. Project configuration and effective remote authentication remain to be checked before publishing. No staging, commit, push, account switch, or repository initialization has occurred in this first step.

## Scope beyond the brief

English interface selection, an explicit administrator role, draft/publication workflow, answer autosave/recovery, and repeat-safe requests are planned additions or interpretations. Their reasons and costs are recorded above. An administrator creation form and browser spreadsheet upload remain prioritized enhancements, not implemented features.

## Deliberately omitted from the core

- Public registration, email verification, and email-based password recovery: closed center enrollment and no external account dependencies.
- Proctoring, camera monitoring, and automatic cheating claims: not needed to enforce quiz integrity.
- AI features inside the product, microservices, cloud infrastructure, and multi-center tenancy: outside the tutoring workflow and timebox.
- Detailed answer-key review, question-bank/versioning systems, and invented pass/fail criteria: beyond the specified score/report requirement.
- Fully offline operation, unrestricted spreadsheet layouts, legacy `.xls`, and formula evaluation: explicitly bounded input/recovery contracts.
- Public hosting as a prerequisite: a local reproducible repository is the required delivery; a hosted demo is optional.

## Unfinished work

All application implementation and tests are currently unfinished. See [PLAN.md](PLAN.md) for the milestones. Replace this statement with the actual remaining gaps as work progresses.

## If another week were available

Prioritize findings from reviewer/user testing, then finish administrator provisioning and browser imports if absent. Improve account recovery, accessibility and device coverage, and question correction/versioning. Measure realistic simultaneous quiz activity before changing the database or deployment model. Establish backup/restore and operating procedures before real center use.
