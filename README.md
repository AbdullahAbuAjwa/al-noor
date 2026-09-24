# مركز النور التعليمي | Al Noor Educational Center

A web application being built for a tutoring center to publish timed quizzes, let students complete one attempt, and review results. Prepared for the byThursday practical assessment.

**Status: core delivery complete.** Students sign in, take a timed multiple-choice quiz on a phone, and see their score; teachers create, edit, and publish quizzes for their own classes and see their students' results; the centre administrator sees results across the centre. The interface is Arabic by default with English, data persists in SQLite, sample data loads on first start, and CSV/XLSX imports load real rosters and quizzes. Known limitations are listed at the end.

**Planning came first.** Before writing application code, Abdullah spent substantial time working through the complete client brief with **ChatGPT Codex**. He challenged assumptions and decided the scope, architecture, role boundaries, timing and grading behavior, import rules, edge cases, delivery order, and verification strategy. [PLAN.md](PLAN.md) and [DECISIONS.md](DECISIONS.md) were the starting point for implementation and continue to evolve as tests and reviews provide evidence. Deliberate planning before coding is part of how he approaches projects generally, especially when using AI tools.

**AI-assisted engineering workflow:** Abdullah defines the scope and makes the technical decisions. Through the bilingual UI milestone he used **ChatGPT Codex** to help implement and reviewed each feature PR himself with **Claude Code** as a read-only review assistant. From the authentication milestone onward he directs **Claude Code** to implement the remaining features, while he still stages, commits, pushes, and merges every change and checks the interface himself. Claude Code's checks of its own code are not an independent review. Tests are added with each feature, and GitHub Actions is configured to run the production build and checks on PRs. [AI_USAGE.md](AI_USAGE.md) records what was actually done and verified.

## What the application does

- Students see quizzes assigned to their class, start or resume an attempt, and view their results.
- Teachers author and publish quizzes for their assigned classes and review results for their quizzes.
- Center administrators review results across the center. Initial accounts come from sample data or authorized imports.
- Arabic is the default interface language; English is selectable and the preference persists in a cookie. Each screen is designed for phones from the start.
- CSV and Excel (`.xlsx`) imports share documented templates and validation rules.

## Running the project

From the repository root, with Docker Desktop (or Docker Engine with Compose v2) running:

```sh
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000) once the server is ready. The first build downloads the base image and npm packages, so it requires internet access and can take several minutes. No host Node.js installation, environment file, cloud account, or private credentials are required. The container runs the production build as a non-root user.

The interface opens in Arabic. The language button switches to English or back to Arabic, stays on the current page, and remembers the choice on this browser. The document direction and page title follow the selected language. Pages include a keyboard skip link and respect reduced-motion settings.

Choose **Sign in** (or open `/login`) and use one of the demo accounts below. Each role lands on its own page:

- **Student** (`/student`): published quizzes for the student's class, with opening/closing times (Amman time), duration, question count, negative-marking rule, and status. Opening a quiz shows its rules and the time available now; **Start quiz** creates the student's single attempt with a server-side deadline (the earlier of the duration and the closing time). Refreshing, signing in again, or pressing start twice resumes the same attempt, and the countdown keeps running. Each answer is saved on the server as soon as it is chosen (or with **Save answer** when JavaScript is off), can be changed or cleared until the deadline, and is shown again after a reload. **Submit quiz** grades the attempt on the server and shows the score out of the maximum with correct/incorrect/unanswered counts (no answer key). If time runs out first, the attempt is graded from the answers saved before the deadline.
- **Teacher** (`/teacher`): only that teacher's quizzes and drafts, with classes, window, settings, and the number of finished attempts. A published quiz's page shows every assigned student's status and score, totals, and the average. **New quiz** creates a draft (title, the teacher's own classes, duration, wrong-answer penalty as a percentage); opening a draft lets its owner edit those settings. On a draft, the owner also adds, edits, and deletes questions (text, points, four options, the correct option). **Publish** asks for opening and closing times in Amman time and a confirmation; the server refuses a quiz without complete questions, a window that is shorter than the duration or already over, and classes the teacher no longer teaches. A published quiz is fixed, opens read-only, and appears on its classes' student pages.
- **Administrator** (`/admin`): centre totals, students per class, and all published quizzes, each linking to its full results.

Opening another role's page sends the account back to its own page; a signed-out visitor is sent to the sign-in page. **Sign out** ends the session on the server. A session lasts at most 12 hours. After five wrong passwords for one username within ten minutes, that username must wait one minute before trying again.

Stop with `Ctrl+C`, or run `docker compose down` from another terminal. If port 3000 is occupied, use `APP_PORT=3001 docker compose up --build` and open `http://localhost:3001` instead (POSIX shell syntax). Compose binds the port to the local machine only.

`GET /api/health` queries an application table and returns `{"status":"ok"}` with caching disabled. If the database cannot be queried, it returns HTTP 503 without connection details. This checks schema connectivity, not quiz correctness.

Startup applies the committed Prisma migrations and initializes demo data once before starting the server. SQLite lives at `/app/data/al-noor.db` in the Compose `app-data` volume. `docker compose down` preserves this volume; ordinary restarts reapply only pending migrations and do not reset records, sample edits, or quiz availability times. Do not use `down --volumes` unless you deliberately want to delete the application data.

The demo creates 60 students across `10A`, `10B`, and `11A`, four teachers, one administrator, three published 15-question quizzes, one teacher draft, and six synthetic completed attempts. Student `01` in each class has no attempt, so those accounts remain ready for the later walkthrough. Published quiz availability is set relative to **first initialization** (opens two hours before; closes 14 days after). A later restart never moves that window.

| Role                                | Demo username    | Demo password      |
| ----------------------------------- | ---------------- | ------------------ |
| Administrator                       | `admin`          | `AdminDemo2026!`   |
| Teacher (math; classes 10A and 10B) | `teacher.math`   | `TeacherDemo2026!` |
| Student (class 10A; no attempt)     | `student.10a.01` | `StudentDemo2026!` |

Other teachers are `teacher.science`, `teacher.english`, and `teacher.history`; their demo password is the same teacher password. Student usernames follow `student.<class>.01` through `.20`, for example `student.11a.01`; they share the student demo password. Usernames are not case-sensitive at sign-in. Passwords are stored as salted scrypt hashes. These documented public credentials are for this assessment demo, not a real deployment.

For an already migrated local database, `npm run db:seed` initializes the same sample data; rerunning it is safe. Seeding deliberately refuses a database that already contains unmarked user/class/quiz/attempt records instead of mixing a public demo roster with existing data. A fresh Compose volume needs no manual seed command.

## Importing CSV or Excel data

The repository includes matching [CSV and XLSX templates](templates) for `teachers`, `students`, and `quiz`. Choose **one format per import**; importing both copies of the same template correctly fails as a duplicate. The example files use new identifiers, so you can import `teachers`, then `students`, then `quiz` into a freshly seeded database. An imported quiz is a **draft** and cannot be attempted until a later authoring flow validates and publishes it.

With Docker running, for example:

```sh
docker compose exec -T app node --import tsx scripts/import.ts teachers templates/teachers.csv
docker compose exec -T app node --import tsx scripts/import.ts students templates/students.xlsx
docker compose exec -T app node --import tsx scripts/import.ts quiz templates/quiz.xlsx
```

To import your own local file, copy it into the running container, then run the appropriate command:

```sh
docker compose cp /path/to/roster.xlsx app:/tmp/roster.xlsx
docker compose exec -T app node --import tsx scripts/import.ts students /tmp/roster.xlsx
```

For local Node.js development, after migration and sample initialization, use `npm run db:import -- teachers templates/teachers.csv` (or `students`/`quiz` and either extension). This CLI requires access to the application container or database and is intended for the center operator; it is not a public upload endpoint. Keep real files containing passwords outside the repository. `npm run templates:generate` regenerates the six committed examples when developing with Node.js 24.

The exact columns, in order, are:

- `teachers`: `username,name,password,classes`
- `students`: `username,name,password,class`
- `quiz`: `quiz_code,quiz_title,teacher_username,classes,duration_minutes,penalty_percent,question_position,question_text,points,option_1,option_2,option_3,option_4,correct_option`

Usernames use 3–64 lowercase ASCII letters/digits/dots/underscores/hyphens and start with a letter. Quiz codes are lowercase with letters/digits/hyphens. `classes` is a semicolon-separated list of **existing** class names; a student's `class` is one existing class. Passwords are 10–128 characters and are hashed before storage. A quiz file describes one quiz, with its code, title, teacher, classes, duration, and penalty repeated identically on each question row. The teacher must already belong to every assigned class. Question positions start at 1 and are consecutive; each question has four distinct nonempty options and one correct option number (1–4). `duration_minutes` is 1–180; `points` is 0.01–1000 and `penalty_percent` is 0–100, each with at most two decimal places. Write `25` for a 25% penalty, never `25%`. In XLSX, make `penalty_percent` a **text cell** (as in the template), not a numeric or percentage-formatted cell: Excel stores `25%` as `0.25`, which is ambiguous without formatting. The imported draft has no availability window until publication.

CSV must be UTF-8 (an optional BOM is accepted) and may use standard quoted cells and newlines. XLSX must contain exactly one worksheet named `Import`; use plain text/number cells. Formulas, macros, and merged cells are rejected. Legacy `.xls` is unsupported. Files are limited to 2 MiB and 500 data rows; workbook archives are additionally bounded before expansion, and a quiz has at most 200 questions. All file values are validated before writing; database references and conflicts are checked within one transaction. Duplicates, missing classes, invalid teacher assignments, and malformed values cause a row/column error and **no partial import**. The row reported for XLSX is its position among nonempty sheet rows.

## Local development (optional)

Use Node.js 24 (`.nvmrc` records the tested patch version) and its bundled npm. Older Node.js versions are rejected during installation. With a compatible Node.js already active:

```sh
npm ci
npm run db:migrate
npm run db:seed
npm run dev
```

The development server also uses `http://localhost:3000`; stop the Compose application first or choose a different development port with `npm run dev -- --port 3001`.

Local development defaults to `.data/al-noor.db`, which is ignored by Git and separate from the Docker volume. The CLI and server share URL resolution; to override the path, set `DATABASE_URL` to a `file:` path in your shell. No `.env` file is required. Prisma Client is generated automatically by the development, build, type-check, and test commands.

## Stack

Installed: Next.js 16.3.6, React 19.3.0, TypeScript 5.9.3, and ESLint 9.39.5, using Node.js 24.19.0 in Docker. Direct versions and `package-lock.json` are repository inputs to `npm ci`; the base image is pinned by its multi-platform digest. ESLint 9 produces an upstream support warning; it is temporarily retained because the current React/accessibility plugins do not support ESLint 10 (see decision D14).

The database uses Prisma 7.10.0 with its matching SQLite adapter; Vitest 5.0.1 runs real-database integration tests. Prisma 7 was chosen over the registry's Prisma 8 release candidate. Scoped transitive dependency overrides address the audit findings documented in decision D19. The runtime also includes Prisma CLI and `tsx` to run the same migration/import code locally and in the container. CSV uses `csv-parse`; XLSX uses `read-excel-file`, with `fflate` for archive limits and unsupported-cell checks. `write-excel-file` is a development-only template generator. Zod, Tailwind CSS, and Playwright remain planned for later features.

## Reviewer walkthrough (about 10 minutes)

1. Run `docker compose up --build` and open http://localhost:3000.
2. Sign in as `student.10a.01` / `StudentDemo2026!`, open the math quiz, read the rules, and **Start quiz**.
3. Answer a few questions (each saves immediately), refresh the page or sign out and back in: the same attempt, answers, and deadline return. Then **Submit quiz** and read the score.
4. Sign in as `teacher.math` / `TeacherDemo2026!`: the math quiz shows that result next to the seeded ones and the students who have not started. Create a **New quiz**, add questions, and **Publish** it for 10A or 10B.
5. Sign in as that class's student again: the new quiz is listed with its window.
6. Sign in as `admin` / `AdminDemo2026!` to see centre totals and every published quiz's results.
7. Switch to English, and try a phone-width window.

Things worth trying to break: a second **Start** or a second tab (still one attempt), answering after the deadline (refused), opening another teacher's quiz or another class's quiz by URL (404), a student posting to teacher endpoints (403), publishing an empty draft or a window shorter than the duration (refused), and wrong passwords (a one-minute cool-down after five). Students `02` and `03` of each class have seeded finished attempts; the other students have not started.

## Verification

With the optional local development dependencies installed:

```sh
npm run check
npm test
npm run build
```

The Docker build runs lint/type checks, the test suite, and the production build, so these checks also work without host Node.js. Database tests apply the committed migrations to isolated temporary files; they never use your configured application database. They cover duplicate/concurrent attempts, invalid relationships, numeric/status constraints, transaction rollback, repeat migration, and persistence after reconnecting. Seed tests cover the roster, demo credentials, sample scores, repeat runs, and refusing an occupied unmarked database. Import tests exercise both formats, real database writes/rollback, authorization of class assignments, malformed inputs, the documented CLI, and the committed templates. Authentication tests cover sign-in for each role, hashed session storage, expiry, logout, forged tokens, and login throttling; access tests cover safe redirects, availability boundaries, and role-scoped data; HTTP-guard tests cover cross-site form posts and bounded request bodies; draft, question, and publication tests cover validation, class ownership, owner-only and draft-only edits, rollback, renumbering after deletion, the question limit, Amman-time conversion, and publication rules. To verify the running container:

```sh
docker compose up --build --detach --wait --wait-timeout 120
docker compose exec -T app node --test scripts/smoke.test.mjs
```

The smoke command runs with the container's Node.js 24, so no host Node.js is needed. It checks health, the Arabic HTML, language switching and its return path, delivery of public and compiled static assets, and sign-in: signed-out redirects, failed and cross-site logins, each demo role's own page and data, refusal of other roles' pages, and sign-out. It also checks quiz-authoring permissions (offered classes, another teacher's quiz, a student's post, a locked published quiz). It signs in and out with the demo accounts, so it adds and removes session rows in the running database. Checks that create records (a teacher creating and editing a draft) run only with `SMOKE_WRITES=1`, which CI sets on its throwaway database; locally they are skipped so your demo data stays clean. If you run it on the host instead, use `npm run test:smoke` with Node.js 24 and set `APP_URL=http://127.0.0.1:3001` when using another port.

The GitHub Actions workflow repeats the container build and HTTP smoke checks on pull requests and pushes to `main`. The language smoke check submits the switch form and verifies the resulting cookie, translated page, and document direction. A workflow file is not evidence of a passing hosted run; GitHub execution can only be checked after the applicant pushes it.

Risk-based unit, integration, smoke, and eventually E2E tests help catch incorrect or unsafe AI-assisted changes; they supplement source review rather than guarantee security. This repository currently has database integration tests and production HTTP smoke checks; complete-journey E2E tests remain planned. The applicant is the sole human reviewer and merger. Requiring PRs and passing checks through GitHub protection of `main` is planned but has **not** been configured or verified yet (decision D22).

Actual verification results are recorded in [AI_USAGE.md](AI_USAGE.md). Quiz unit/integration tests and full user-journey E2E tests will arrive with their features; see the [test strategy](PLAN.md#verification-strategy).

## Project references

- [Implementation plan and acceptance criteria](PLAN.md)
- [Decisions, assumptions, trade-offs, and omissions](DECISIONS.md)
- [Actual AI use and verification record](AI_USAGE.md)
- [Repository instructions for coding agents](AGENTS.md)
- [Claude Code review instructions](CLAUDE.md)

## Current limitations

- **Connection recovery is in-page only.** Each answer is saved when chosen and a failed save shows **Try again**; answers chosen while offline are not queued in the browser, and two tabs editing the same attempt are not reconciled beyond "last save wins".
- **Accounts:** no password change, recovery, or in-app account management; accounts come from the seed or the import command (an administrator form was an optional enhancement).
- **Imports** run from the command line (`scripts/import.ts`); there is no browser upload, and results cannot be exported yet.
- **Login throttling** is per username and in the server's memory; rotating usernames still reaches the password check (DECISIONS D23).
- **Published quizzes are fixed** by design: no unpublishing, window changes, or question corrections after publication (D04).
- **Verification limits:** automated tests and Docker smoke checks are recorded in [AI_USAGE.md](AI_USAGE.md); browser, phone, and screen-reader checks are the applicant's manual checks, and the app has not been tested behind an HTTPS proxy or with sustained concurrent load.

Decisions, alternatives, and "if another week were available" are in [DECISIONS.md](DECISIONS.md).
