import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { createDatabaseClient } from "../src/server/db/client";

const root = mkdtempSync(join(tmpdir(), "al-noor-db-tests-"));
const template = join(root, "template.db");
let directory: string;
let url: string;
let db: Awaited<ReturnType<typeof createDatabaseClient>>;

function migrate(databaseUrl: string) {
  return execFileSync(
    process.execPath,
    ["--import", "tsx", "scripts/migrate.ts"],
    {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      encoding: "utf8",
      stdio: "pipe",
    },
  );
}

async function question(id: string, quizId = "quiz", position = 1) {
  return db.question.create({
    data: {
      id,
      quizId,
      position,
      text: "ما ناتج جمع اثنين وثلاثة؟",
      pointsHundredths: 250,
      correctOptionPosition: 2,
      options: {
        create: [1, 2, 3, 4].map((index) => ({
          id: `${id}-${index}`,
          position: index,
          text: `الخيار ${index}`,
        })),
      },
    },
  });
}

function attemptData() {
  return {
    studentId: "student",
    quizId: "quiz",
    startedAt: new Date("2026-09-24T10:00:00.000Z"),
    deadlineAt: new Date("2026-09-24T10:20:00.000Z"),
  };
}

beforeAll(() => {
  migrate(`file:${template}`);
});
afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

beforeEach(async () => {
  directory = mkdtempSync(join(root, "case-"));
  const file = join(directory, "test.db");
  copyFileSync(template, file);
  url = `file:${file}`;
  db = await createDatabaseClient(url);
  await db.class.create({ data: { id: "class", name: "10A" } });
  await db.user.createMany({
    data: [
      {
        id: "teacher",
        username: "teacher",
        name: "أحمد",
        role: "TEACHER",
        passwordHash: "test-only",
      },
      {
        id: "student",
        username: "student",
        name: "نور",
        role: "STUDENT",
        classId: "class",
        passwordHash: "test-only",
      },
    ],
  });
  await db.quiz.create({
    data: {
      id: "quiz",
      code: "math-10a",
      title: "اختبار الرياضيات",
      teacherId: "teacher",
    },
  });
});

afterEach(async () => {
  await db?.$disconnect();
  if (directory) rmSync(directory, { recursive: true, force: true });
});

describe("real SQLite migrations and constraints", () => {
  it("reapplies migrations without replacing existing data", async () => {
    await db.$disconnect();
    expect(migrate(url)).toContain("No pending migrations");
    db = await createDatabaseClient(url);
    expect(await db.user.count()).toBe(2);
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: "student" } })).name,
    ).toBe("نور");
  });

  it("preserves timestamps and records when a database connection is reopened", async () => {
    await db.attempt.create({ data: attemptData() });
    await db.$disconnect();
    db = await createDatabaseClient(url);
    const saved = await db.attempt.findFirstOrThrow();
    expect(saved.startedAt.toISOString()).toBe("2026-09-24T10:00:00.000Z");
    expect(saved.deadlineAt.toISOString()).toBe("2026-09-24T10:20:00.000Z");
    expect(await db.$queryRawUnsafe("PRAGMA journal_mode")).toEqual([
      { journal_mode: "wal" },
    ]);
  });

  it("enforces foreign keys on every application connection", async () => {
    await expect(
      db.user.update({
        where: { id: "student" },
        data: { classId: "missing" },
      }),
    ).rejects.toThrow();
  });

  it("requires a class for students and forbids one for other roles", async () => {
    await expect(
      db.user.update({ where: { id: "student" }, data: { classId: null } }),
    ).rejects.toThrow();
    await expect(
      db.user.update({ where: { id: "teacher" }, data: { classId: "class" } }),
    ).rejects.toThrow();
  });

  it("rejects invalid roles even through raw SQL", async () => {
    await expect(
      db.$executeRaw`UPDATE "User" SET role = 'SUPER_ADMIN' WHERE id = 'teacher'`,
    ).rejects.toThrow();
  });

  it("requires unique canonical lowercase usernames", async () => {
    await expect(
      db.user.update({
        where: { id: "teacher" },
        data: { username: "student" },
      }),
    ).rejects.toThrow();
    await expect(
      db.user.update({
        where: { id: "teacher" },
        data: { username: "Teacher" },
      }),
    ).rejects.toThrow();
  });

  it("allows exactly one attempt when two connections insert concurrently", async () => {
    const other = await createDatabaseClient(url);
    try {
      const results = await Promise.allSettled([
        db.attempt.create({ data: attemptData() }),
        other.attempt.create({ data: attemptData() }),
      ]);
      expect(
        results.filter((result) => result.status === "fulfilled"),
      ).toHaveLength(1);
      expect(await db.attempt.count()).toBe(1);
    } finally {
      await other.$disconnect();
    }
  });

  it("rejects options from another question on both answer creation and update", async () => {
    await question("q1");
    await question("q2", "quiz", 2);
    const attempt = await db.attempt.create({ data: attemptData() });
    const data = {
      attemptId: attempt.id,
      quizId: "quiz",
      questionId: "q1",
      optionId: "q2-1",
    };
    await expect(db.answer.create({ data })).rejects.toThrow();
    await db.answer.create({ data: { ...data, optionId: "q1-2" } });
    await expect(
      db.answer.update({
        where: {
          attemptId_questionId: { attemptId: attempt.id, questionId: "q1" },
        },
        data: { optionId: "q2-2" },
      }),
    ).rejects.toThrow();
  });

  it("rejects questions from another quiz", async () => {
    await db.quiz.create({
      data: {
        id: "other-quiz",
        code: "other",
        title: "آخر",
        teacherId: "teacher",
      },
    });
    await question("q3", "other-quiz");
    const attempt = await db.attempt.create({ data: attemptData() });
    for (const quizId of ["quiz", "other-quiz"]) {
      await expect(
        db.answer.create({
          data: {
            attemptId: attempt.id,
            quizId,
            questionId: "q3",
            optionId: "q3-1",
          },
        }),
      ).rejects.toThrow();
    }
  });

  it("bounds option positions to four distinct choices", async () => {
    await question("q1");
    await expect(
      db.option.create({
        data: { questionId: "q1", position: 5, text: "خامس" },
      }),
    ).rejects.toThrow();
    await expect(
      db.option.create({
        data: { questionId: "q1", position: 1, text: "مكرر" },
      }),
    ).rejects.toThrow();
  });

  it("rejects invalid question points and correct-option positions", async () => {
    await question("q1");
    await expect(
      db.question.update({
        where: { id: "q1" },
        data: { pointsHundredths: 0 },
      }),
    ).rejects.toThrow();
    await expect(
      db.question.update({
        where: { id: "q1" },
        data: { correctOptionPosition: 5 },
      }),
    ).rejects.toThrow();
  });

  it("bounds duration and penalty and requires a valid window when published", async () => {
    await expect(
      db.quiz.update({ where: { id: "quiz" }, data: { durationMinutes: 0 } }),
    ).rejects.toThrow();
    await expect(
      db.quiz.update({ where: { id: "quiz" }, data: { penaltyBps: 10001 } }),
    ).rejects.toThrow();
    await expect(
      db.quiz.update({ where: { id: "quiz" }, data: { status: "PUBLISHED" } }),
    ).rejects.toThrow();
    await expect(
      db.quiz.update({
        where: { id: "quiz" },
        data: {
          opensAt: new Date("2026-09-24T10:00:00Z"),
          closesAt: new Date("2026-09-24T09:00:00Z"),
        },
      }),
    ).rejects.toThrow();
  });

  it("rejects invalid attempt deadlines and incomplete final results", async () => {
    await expect(
      db.attempt.create({
        data: { ...attemptData(), deadlineAt: attemptData().startedAt },
      }),
    ).rejects.toThrow();
    await expect(
      db.attempt.create({ data: { ...attemptData(), status: "SUBMITTED" } }),
    ).rejects.toThrow();
  });

  it("rolls back an entire transaction when a later write fails", async () => {
    await expect(
      db.$transaction(async (tx) => {
        await tx.class.create({ data: { name: "11A" } });
        await tx.class.create({ data: { name: "10A" } });
      }),
    ).rejects.toThrow();
    expect(await db.class.findUnique({ where: { name: "11A" } })).toBeNull();
  });

  it("protects referenced quiz history from deletion", async () => {
    await db.attempt.create({ data: attemptData() });
    await expect(db.quiz.delete({ where: { id: "quiz" } })).rejects.toThrow();
    await expect(
      db.user.delete({ where: { id: "student" } }),
    ).rejects.toThrow();
  });
});
