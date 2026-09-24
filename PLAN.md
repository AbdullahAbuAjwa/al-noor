# Implementation plan

Planning baseline: 2026-09-23. This document records intended work; unchecked items are not implemented or verified.

Project root: `al-noor/` inside the original assessment folder. The user performs all staging, commits, and pushes; the assistant prepares and verifies each change and suggests its commit subject. The user's personal Git author identity and effective GitHub authentication must be verified separately before delivery.

Current progress: bootstrap was merged into `main` in `a2550d8`; the applicant reported its Claude review complete. The database foundation was committed as `566f53e` on `feat/data-imports`. The second part adds repeat-safe demo data and has passed local/container checks; it awaits the applicant's next commit. CSV/XLSX imports remain pending.

## Objective and source

Build a small, reliable timed-quiz application for **Al Noor Educational Center / مركز النور التعليمي** within the assessment timebox.

The primary requirements source is the three-page `byThursday_Brief.pdf` supplied by the assessment team. It calls for a runnable public source repository, one-command startup, loadable realistic sample data, automated tests, progressive commits, and honest decision and AI-use documentation. The supplied PDF is retained locally and is not an application dependency.

The client's scenario is fictional. Product behavior beyond the brief is recorded as an assumption or scope choice in [DECISIONS.md](DECISIONS.md).

## Delivery priorities

### Core delivery

- [x] One-command local startup, migrations, persistent storage, and first-use sample initialization.
- [ ] Login, logout, server-side sessions, and student/teacher/administrator authorization.
- [ ] Arabic by default, selectable English, and responsive screens as each feature is built.
- [ ] Teacher quiz drafts, question editing, assignment to authorized classes, and publication.
- [ ] One timed attempt per student and quiz, resumable before its deadline.
- [ ] Answer autosave, visible save status, bounded connection recovery, and repeat-safe submission.
- [ ] Server-side weighted grading with configurable negative marking and a final score floor of zero.
- [ ] Student results, teacher results for owned quizzes, and center-wide administrator reports.
- [ ] CSV and XLSX templates and an authorized, documented import command for teachers, students, and quiz data.
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

Milestone 3 uses the proposed branch `feat/data-imports` and separate applicant-created commits:

1. `feat: add SQLite schema, migrations and database constraints` — schema, persistent storage, automatic migrations, readiness check, and real-database tests.
2. `feat: add repeat-safe demo data and sample accounts` — deterministic sample identities and content, password hashes, relative first-use availability, and seed repeat-safety tests.
3. `feat: add validated CSV and XLSX imports` — documented templates, format readers, shared validation, transactional CLI import, and invalid-input/rollback tests.

Hand off each verified part for a commit before starting the next, as the applicant owns staging and commits. Keep the PR open until all three parts are implemented and reviewed; the first part alone does not complete milestone 3.

Use one short-lived branch at a time, starting from the updated `main` after the previous feature is merged. Keep coherent intermediate commits; a feature branch need not contain only one commit. The first implementation branch is `chore/bootstrap` for milestone 2 only.

The applicant chose Claude Code for an additional review of each completed feature. That review should be read-only and identify concrete failure scenarios, file locations, and relevant missing tests. Discuss findings, fix confirmed problems, and record actual review evidence. Codex implementation and Claude review are both AI-assisted work; neither is an independent human approval. The applicant controls commits, pushes, and merges. Keep meaningful commits when merging, as progressive history is a delivery requirement.

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
