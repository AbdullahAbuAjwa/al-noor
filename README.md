# مركز النور التعليمي | Al Noor Educational Center

A web application being built for a tutoring center to publish timed quizzes, let students complete one attempt, and review results. Prepared for the byThursday practical assessment.

**Current status: application bootstrap.** The current application displays an Arabic welcome page and exposes a health endpoint. Accounts, quizzes, and persistence belong to the following milestones; they are not available yet.

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

`GET /api/health` returns `{"status":"ok"}` with caching disabled. This currently checks server liveness, not database connectivity or quiz correctness.

The next data milestone will add migrations, first-use sample initialization, and SQLite files in a named volume. No data is persisted by the bootstrap, and no demo accounts, passwords, import commands, or reset command exist yet.

## Local development (optional)

Use Node.js 24 (`.nvmrc` records the tested patch version) and its bundled npm. Older Node.js versions are rejected during installation. With a compatible Node.js already active:

```sh
npm ci
npm run dev
```

The development server also uses `http://localhost:3000`; stop the Compose application first or choose a different development port with `npm run dev -- --port 3001`.

## Stack

Installed: Next.js 16.3.6, React 19.3.0, TypeScript 5.9.3, and ESLint 9.39.5, using Node.js 24.19.0 in Docker. Direct versions and `package-lock.json` are repository inputs to `npm ci`; the base image is pinned by its multi-platform digest. ESLint 9 produces an upstream support warning; it is temporarily retained because the current React/accessibility plugins do not support ESLint 10 (see decision D14).

SQLite, Prisma, Zod, Tailwind CSS, Vitest, and Playwright remain planned. Add them with the feature that needs them instead of installing unused dependencies now.

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
npm run build
```

The Docker build runs both lint/type checks and the production build, so these checks also work without host Node.js. To verify the running container:

```sh
docker compose up --build --detach --wait --wait-timeout 120
npm run test:smoke
```

The smoke command requires Node.js 24 but no installed npm packages. It checks health, the Arabic HTML, and the actual delivery of public and compiled static assets. Set `APP_URL=http://127.0.0.1:3001` before the smoke command when using another port.

The GitHub Actions workflow repeats the container build and HTTP smoke checks on pull requests and pushes to `main`. A workflow file is not evidence of a passing hosted run; GitHub execution can only be checked after the applicant pushes it.

Bootstrap verification results are recorded in [AI_USAGE.md](AI_USAGE.md). Quiz unit/integration tests and full user-journey E2E tests will arrive with their features; see the [test strategy](PLAN.md#verification-strategy).

## Project references

- [Implementation plan and acceptance criteria](PLAN.md)
- [Decisions, assumptions, trade-offs, and omissions](DECISIONS.md)
- [Actual AI use and verification record](AI_USAGE.md)
- [Repository instructions for coding agents](AGENTS.md)
- [Claude Code review instructions](CLAUDE.md)

## Current limitations

This is a bootstrap, not a completed assessment. Database persistence, imports, sample accounts, authentication, quiz behavior, reports, and language switching remain unimplemented. The temporary welcome page has Arabic and English copy prepared, but currently renders Arabic only; the shared bilingual UI is a later milestone. The complete scope and deferred enhancements are tracked in [PLAN.md](PLAN.md).
