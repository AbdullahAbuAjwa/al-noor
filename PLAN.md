# Implementation plan

Planning baseline: 2026-09-23. This document records intended work; unchecked items are not implemented or verified.

Project root: `al-noor/` inside the original assessment folder. The user performs all staging, commits, and pushes; the assistant prepares and verifies each change and suggests its commit subject. The user's personal Git author identity and effective GitHub authentication must be verified separately before delivery.

Current progress: milestones 1–5 are merged into `main` (latest `d176e91`, authentication and role-based access). Milestone 6 (quiz authoring) is in progress on `feat/quiz-authoring`: a sign-in language fix, part 1 (draft settings), part 2 (question editing), and part 3 (publication with an availability window). Attempts, grading, and reports remain pending.

## Objective and source

Build a small, reliable timed-quiz application for **Al Noor Educational Center / مركز النور التعليمي** within the assessment timebox.

The primary requirements source is the three-page `byThursday_Brief.pdf` supplied by the assessment team. It calls for a runnable public source repository, one-command startup, loadable realistic sample data, automated tests, progressive commits, and honest decision and AI-use documentation. The supplied PDF is retained locally and is not an application dependency.

The client's scenario is fictional. Product behavior beyond the brief is recorded as an assumption or scope choice in [DECISIONS.md](DECISIONS.md).

This plan was developed with substantial applicant–Codex discussion before application code was written. It covered requirements, ambiguity, architecture, priority under the time limit, failure cases, tests, and commit boundaries. The applicant treats this deliberate planning as the foundation for implementing and reviewing AI-assisted work; the plan remains editable when real evidence changes a decision.

## Delivery priorities

### Core delivery

- [x] One-command local startup, migrations, persistent storage, and first-use sample initialization.
- [x] Login, logout, server-side sessions, and student/teacher/administrator authorization (home pages; each later feature adds its own checks).
- [ ] Arabic by default, selectable English, and responsive screens as each feature is built.
- [x] Teacher quiz drafts, question editing, assignment to authorized classes, and publication.
- [ ] One timed attempt per student and quiz, resumable before its deadline.
- [ ] Answer autosave, visible save status, bounded connection recovery, and repeat-safe submission.
- [ ] Server-side weighted grading with configurable negative marking and a final score floor of zero.
- [ ] Student results, teacher results for owned quizzes, and center-wide administrator reports.
- [x] CSV and XLSX templates and an authorized, documented import command for teachers, students, and quiz data.
- [ ] Risk-based automated tests, fresh-start verification, and accurate documentation.

### Enhancements after the core passes

1. A minimal administrator form to create individual students and teachers.
2. A teacher-facing CSV/XLSX upload interface within a quiz draft, reusing the core importer.
3. Result export and/or a hosted demo, if time remains.

Do not display working-looking controls for unfinished features. Keep actual unfinished work visible in the README and decisions record.

## User journeys

| Role          | Entry page      | Main flow                                                                                  |
| ------------- | --------------- | ------------------------------------------------------------------------------------------ |
| Student       | My quizzes      | Eligible quiz -> timing/marking instructions -> start/resume -> answer -> submit -> result |
| Teacher       | My quizzes      | Draft -> questions and settings -> validation -> publish -> student results                |
| Administrator | Center overview | Filter by class, teacher, or quiz -> inspect participation and final results               |

One login page routes users according to the role stored by the server. A shared visual shell supplies the language selector, account identity, navigation, and logout. The attempt screen prioritizes the question, timer, save state, question navigation, and submission.

## Data model outline

- **User / Session:** identity, one role per account, password hash, and server-managed session.
- **Class / TeacherClass:** each student belongs to one class; a teacher may teach multiple classes.
- **Quiz / QuizClass:** teacher ownership, assigned classes, draft/published state, availability, duration, and penalty policy.
- **Question / Option:** ordered questions with positive points and four options; one correct option is the planned interpretation.
- **Attempt / Answer:** one attempt per student/quiz, timestamps, saved selections, mutation version, and final result.

Keep business rules in server-side services outside UI components. Use database uniqueness, foreign keys, and transactions to support the rules. Final field names and schema constraints are implementation details to confirm with the ORM and database.

## Milestones and commit boundaries

Every feature milestone includes relevant tests and updates to DECISIONS.md and AI_USAGE.md. Commit subjects below describe intended boundaries, not fabricated history or a required commit count.

| #   | Intended commit                                       | Completion evidence                                                                                           |
| --- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | `docs: record scope, decisions and AI workflow`       | Requirements, assumptions, priorities, and honest current status recorded; documentation links checked        |
| 2   | `chore: bootstrap app and one-command startup`        | A clean build starts without host Node.js or private configuration                                            |
| 3   | `feat: add database, demo data and CSV/XLSX imports`  | Migrations and both import formats work; seed is repeat-safe; invalid imports do not partially persist        |
| 4   | `feat: add responsive bilingual UI foundation`        | Arabic default, English selection, direction, common components, and language persistence work                |
| 5   | `feat: add authentication and role-based access`      | Actual login/logout; direct unauthorized requests rejected; navigation follows account role                   |
| 6   | `feat: add quiz authoring and publishing`             | Teacher can publish a valid draft for authorized classes; invalid publication and forbidden edits fail        |
| 7   | `feat: add timed attempts and resume support`         | Concurrent starts create one attempt; refresh preserves deadline and saved answers                            |
| 8   | `feat: add autosave and connection recovery`          | Save acknowledgments, retries, stale-write handling, and expiry behavior verified                             |
| 9   | `feat: add atomic submission and grading`             | Repeated and concurrent submissions are stable; final answers cannot change; grading examples pass            |
| 10  | `feat: add role-scoped results and reports`           | Each role sees permitted results and appropriate participation states                                         |
| 11  | `test: verify end-to-end flows and clean startup`     | Production-build journeys and fresh-storage startup pass; restart preserves results                           |
| 12  | `docs: finalize reviewer guide and known limitations` | Instructions match the delivered checkout; actual commands, credentials, limitations, and AI use are accurate |

Genuine fixes and scope changes get their own commits when appropriate. A milestone may be split into smaller coherent commits. Do not defer all testing to milestone 11 or all documentation to milestone 12. All commit subjects are handoff suggestions for the user, not authorization for the assistant to stage, commit, or push.

### Branch and review workflow

Milestone 3 was merged from `feat/data-imports` with separate applicant-created commits:

1. `feat: add SQLite schema, migrations and database constraints` — schema, persistent storage, automatic migrations, readiness check, and real-database tests.
2. `feat: add repeat-safe demo data and sample accounts` — deterministic sample identities and content, password hashes, relative first-use availability, and seed repeat-safety tests.
3. `feat: add validated CSV and XLSX imports` — documented templates, format readers, shared validation, transactional CLI import, and invalid-input/rollback tests.

Milestone 4 uses `feat/bilingual-ui-foundation` and two reviewable parts:

1. `feat: add Arabic-first language selection` — server-rendered language/direction, persistent preference, and HTTP behavior checks.
2. `feat: add responsive educational app shell` — shared visual components and phone/keyboard/reduced-motion review.

Hand off each verified part for the applicant's commit; documentation and appropriate tests accompany the part they explain. The feature PR covers both parts.

Milestone 5 uses `feat/auth-role-access`. It is the first milestone implemented by Claude Code (D24); the applicant still stages, commits, pushes, and merges. It is committed in three parts:

1. `feat: add hashed sessions and password sign-in` — sessions, login/logout handlers, throttling, safe paths, cross-site and body-size guards, and their tests.
2. `feat: add server-side role checks and role-scoped data` — the page role guard, availability rule, role-scoped queries, and their tests.
3. `feat: add bilingual sign-in and role home pages` — login and role pages, account bar, language return path, smoke checks, and documentation.

This milestone's code was written before it was split (AI_USAGE Session 14). From milestone 6 on, each part is implemented and handed off only after the previous part is committed.

Milestone 6 uses `feat/quiz-authoring`, after a review fix (`fix: keep sign-in page state when switching language`):

1. `feat: let teachers create and edit quiz drafts` — draft settings, class ownership, owner/draft-only edits, pages, and tests.
2. `feat: add question editing to quiz drafts` — questions with four options and one correct answer, draft-only and owner-only.
3. `feat: publish validated quizzes with an availability window` — full validation, Amman-time window, lock after publication, and student visibility.

Use one short-lived branch at a time, starting from the updated `main` after the previous feature is merged. Keep coherent intermediate commits; a feature branch need not contain only one commit. The first implementation branch is `chore/bootstrap` for milestone 2 only.

Through milestone 4, the applicant directed **ChatGPT Codex** during implementation, then used **Claude Code to assist his own PR review**. From milestone 5, Claude Code implements at the applicant's direction (D24), and its checks of its own code are not an independent review; the rest of this paragraph describes the earlier review arrangement. Ask Claude to inspect the full diff read-only and identify concrete failure scenarios, file locations, and missing tests. The applicant assesses findings, fixes confirmed problems, and records actual evidence. This follows his normal team-project habit of one branch and reviewed PR per feature, tests alongside each feature, and a GitHub build/check. In this solo repo, Claude-assisted self-review is not a second human approval. Pair it with risk-based unit, integration, smoke, and later E2E tests; the applicant controls commits, pushes, and merges. Keep meaningful commits when merging, as progressive history is a delivery requirement. Protecting `main` with required PRs and checks is a planned repository-setting step; do not describe it as enabled until verified.

## Verification strategy

| Level         | Coverage target                                                                                | Examples                                                                                                                           |
| ------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Unit          | Every critical scoring and timing branch                                                       | Correct/wrong/blank answers, mixed points, zero penalty, final floor zero, deadline boundaries                                     |
| Integration   | Authorization, database integrity, and state transitions using a real isolated SQLite database | Two concurrent starts, foreign option IDs, cross-user access, save/submit races, repeated submit, import rollback                  |
| E2E           | A small set of complete user journeys                                                          | Teacher publishes -> student completes -> teacher/admin sees result; refresh/resume; language switching without losing the attempt |
| Manual/visual | Usability not established by assertions alone                                                  | Arabic mixed with numbers/English, phone layout, keyboard focus, save warnings, reduced motion                                     |
| Startup smoke | Reproducibility of the delivery                                                                | Fresh tracked checkout and new volume; first initialization; restart without resetting attempts                                    |

Use hand-calculated expected grades rather than the production scorer to generate test expectations. Inject a controllable server clock for time-sensitive tests. Exercise real transactions and constraints in integration tests; do not use a mocked database as evidence that concurrency is safe.

Test pending-answer recovery before and after expiry, stale updates from another tab, and the absence of answer keys from student responses. A phone viewport test supplements, but does not replace, visual review. Record untested environments honestly.

## Delivery gate

Reserve the final 90-120 minutes of available work for verification and documentation. Stop starting optional features during that period.

- [ ] Build, type checking, linting, and implemented automated suites pass.
- [ ] The startup command works from tracked files with fresh storage and without personal credentials.
- [ ] Sample student, teacher, and administrator accounts work and their scopes are verified.
- [ ] CSV and XLSX examples are loadable; restart behavior preserves results.
- [ ] Main journeys work in Arabic and English on phone and desktop layouts.
- [ ] README instructions and credentials are accurate; decision and AI-use records reflect actual work.
- [ ] Unfinished work and next-week priorities are explicit.
- [ ] Source and progressive commits are in the public repository before its link is submitted.

Repository publication and submission are separate delivery actions. Do not imply a repository has been published or an email sent until those actions actually occur.
