# مركز النور التعليمي | Al Noor Educational Center

A web application being built for a tutoring center to publish timed quizzes, let students complete one attempt, and review results. Prepared for the byThursday practical assessment.

**Current status: database foundation.** The application has a persistent SQLite schema, startup migrations, an Arabic welcome page, and a database readiness endpoint. Demo data, imports, login, and quiz workflows are not available yet.

## Planned experience

- Students see quizzes assigned to their class, start or resume an attempt, and view their results.
- Teachers author and publish quizzes for their assigned classes and review results for their quizzes.
- Center administrators review results across the center. Initial accounts come from sample data or authorized imports.
- Arabic is the default interface language; English is selectable. Each screen is designed for phones from the start.
- CSV and Excel (`.xlsx`) imports share documented templates and validation rules.

## Running the project

From the repository root, with Docker Desktop (or Docker Engine with Compose v2) running:

```sh
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000) once the server is ready. The first build downloads the base image and npm packages, so it requires internet access and can take several minutes. No host Node.js installation, environment file, cloud account, or private credentials are required. The container runs the production build as a non-root user.

Stop with `Ctrl+C`, or run `docker compose down` from another terminal. If port 3000 is occupied, use `APP_PORT=3001 docker compose up --build` and open `http://localhost:3001` instead (POSIX shell syntax). Compose binds the port to the local machine only.

`GET /api/health` queries an application table and returns `{"status":"ok"}` with caching disabled. If the database cannot be queried, it returns HTTP 503 without connection details. This checks schema connectivity, not quiz correctness.

Startup applies the committed Prisma migrations before starting the server. SQLite lives at `/app/data/al-noor.db` in the Compose `app-data` volume. `docker compose down` preserves this volume; ordinary restarts reapply only pending migrations and do not reset records. Do not use `down --volumes` unless you deliberately want to delete the application data.

Demo initialization and CSV/XLSX import commands are the next two parts of this milestone. No demo accounts or passwords have been created yet.

## Local development (optional)

Use Node.js 24 (`.nvmrc` records the tested patch version) and its bundled npm. Older Node.js versions are rejected during installation. With a compatible Node.js already active:

```sh
npm ci
npm run db:migrate
npm run dev
```

The development server also uses `http://localhost:3000`; stop the Compose application first or choose a different development port with `npm run dev -- --port 3001`.

Local development defaults to `.data/al-noor.db`, which is ignored by Git and separate from the Docker volume. The CLI and server share URL resolution; to override the path, set `DATABASE_URL` to a `file:` path in your shell. No `.env` file is required. Prisma Client is generated automatically by the development, build, type-check, and test commands.

## Stack

Installed: Next.js 16.3.6, React 19.3.0, TypeScript 5.9.3, and ESLint 9.39.5, using Node.js 24.19.0 in Docker. Direct versions and `package-lock.json` are repository inputs to `npm ci`; the base image is pinned by its multi-platform digest. ESLint 9 produces an upstream support warning; it is temporarily retained because the current React/accessibility plugins do not support ESLint 10 (see decision D14).

The database uses Prisma 7.10.0 with its matching SQLite adapter; Vitest 5.0.1 runs real-database integration tests. Prisma 7 was chosen over the registry's Prisma 8 release candidate. Scoped transitive dependency overrides address the audit findings documented in decision D19. The runtime also includes Prisma CLI and `tsx` to run the same migration code locally and in the container. Zod, Tailwind CSS, and Playwright remain planned for later features.

## Planned reviewer walkthrough

1. Start a fresh checkout using the documented command.
2. Sign in as a sample student and open an available quiz that has not been attempted.
3. Answer questions, refresh, resume the same attempt, and submit.
4. Sign in as the associated teacher to inspect the result and publish a new quiz for that class.
5. Sign in as an administrator to inspect center-wide results.
6. Try both interface languages and a phone-sized viewport.

The seed will include approximately 60 students across `10A`, `10B`, and `11A`, four teachers, an administrator, and Arabic and English quizzes. Separate synthetic completed attempts will make reports useful without consuming the primary demo student's available quiz.

## Verification

With the optional local development dependencies installed:

```sh
npm run check
npm test
npm run build
```

The Docker build runs lint/type checks, the database integration suite, and the production build, so these checks also work without host Node.js. Database tests apply the committed migrations to isolated temporary files; they never use your configured application database. They cover duplicate/concurrent attempts, invalid relationships, numeric/status constraints, transaction rollback, repeat migration, and persistence after reconnecting. To verify the running container:

```sh
docker compose up --build --detach --wait --wait-timeout 120
npm run test:smoke
```

The smoke command requires Node.js 24 but no installed npm packages. It checks health, the Arabic HTML, and the actual delivery of public and compiled static assets. Set `APP_URL=http://127.0.0.1:3001` before the smoke command when using another port.

The GitHub Actions workflow repeats the container build and HTTP smoke checks on pull requests and pushes to `main`. A workflow file is not evidence of a passing hosted run; GitHub execution can only be checked after the applicant pushes it.

Actual verification results are recorded in [AI_USAGE.md](AI_USAGE.md). Quiz unit/integration tests and full user-journey E2E tests will arrive with their features; see the [test strategy](PLAN.md#verification-strategy).

## Project references

- [Implementation plan and acceptance criteria](PLAN.md)
- [Decisions, assumptions, trade-offs, and omissions](DECISIONS.md)
- [Actual AI use and verification record](AI_USAGE.md)
- [Repository instructions for coding agents](AGENTS.md)
- [Claude Code review instructions](CLAUDE.md)

## Current limitations

This is a database foundation, not a completed assessment. Imports, sample accounts, authentication, quiz behavior, reports, and language switching remain unimplemented. Foreign keys and checks protect stored relationships, but role authorization, complete quiz-publication validation, deadline enforcement, and finalization rules still belong to the upcoming server services. The temporary welcome page has Arabic and English copy prepared, but currently renders Arabic only. The complete scope and deferred enhancements are tracked in [PLAN.md](PLAN.md).
