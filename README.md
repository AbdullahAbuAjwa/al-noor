# مركز النور التعليمي | Al Noor Educational Center

A planned web application for a tutoring center to publish timed quizzes, let students complete one attempt, and review results. Prepared for the byThursday practical assessment.

**Current status: planning and documentation only. The application is not runnable yet.**

## Planned experience

- Students see quizzes assigned to their class, start or resume an attempt, and view their results.
- Teachers author and publish quizzes for their assigned classes and review results for their quizzes.
- Center administrators review results across the center. Initial accounts come from sample data or authorized imports.
- Arabic is the default interface language; English is selectable. Each screen is designed for phones from the start.
- CSV and Excel (`.xlsx`) imports share documented templates and validation rules.

## Running the project

The target startup command is shown below. **It will become usable in the bootstrap milestone; it does not work at this stage.**

```sh
docker compose up --build
```

The intended prerequisites are a downloaded checkout, Docker with Compose running, and internet access for the first build. The application should not require a host installation of Node.js, a hosted database account, or private service credentials.

Startup will apply migrations, initialize demo data on first use, and serve the application at `http://localhost:3000`. Database files will persist in a named volume. Ordinary restarts must not reset attempts or replace existing data.

Verified installation instructions, actual demo credentials, import commands, and explicit reset instructions will be added alongside their implementation. No accounts or passwords have been created yet.

## Planned stack

Next.js, TypeScript, SQLite, Prisma, Zod, Tailwind CSS, Vitest, Playwright, and Docker Compose. Compatible versions will be selected and locked during bootstrap.

## Planned reviewer walkthrough

1. Start a fresh checkout using the documented command.
2. Sign in as a sample student and open an available quiz that has not been attempted.
3. Answer questions, refresh, resume the same attempt, and submit.
4. Sign in as the associated teacher to inspect the result and publish a new quiz for that class.
5. Sign in as an administrator to inspect center-wide results.
6. Try both interface languages and a phone-sized viewport.

The seed will include approximately 60 students across `10A`, `10B`, and `11A`, four teachers, an administrator, and Arabic and English quizzes. Separate synthetic completed attempts will make reports useful without consuming the primary demo student's available quiz.

## Verification

No application tests have run because implementation has not started. Test commands and reproducible evidence will be documented as they become available. See the [test strategy](PLAN.md#verification-strategy).

## Project references

- [Implementation plan and acceptance criteria](PLAN.md)
- [Decisions, assumptions, trade-offs, and omissions](DECISIONS.md)
- [Actual AI use and verification record](AI_USAGE.md)
- [Repository instructions for coding agents](AGENTS.md)

## Current limitations

This initial version contains documentation only. Application code, container setup, imports, sample data, authentication, user interfaces, and automated tests remain to be implemented. The complete planned scope and deferred enhancements are tracked in [PLAN.md](PLAN.md).
