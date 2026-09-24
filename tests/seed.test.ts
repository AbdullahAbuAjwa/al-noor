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
import {
  demoPasswords,
  demoSeedId,
  seedDemoData,
} from "../src/server/demo/seed";
import { verifyPassword } from "../src/server/auth/password";

const root = mkdtempSync(join(tmpdir(), "al-noor-seed-tests-"));
const template = join(root, "template.db");
const firstUse = new Date("2031-06-01T12:00:00.000Z");
let directory: string;
let url: string;
let db: Awaited<ReturnType<typeof createDatabaseClient>>;

function runScript(script: string, databaseUrl: string) {
  return execFileSync(process.execPath, ["--import", "tsx", script], {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    encoding: "utf8",
  });
}

beforeAll(() => {
  runScript("scripts/migrate.ts", `file:${template}`);
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
});
afterEach(async () => {
  await db?.$disconnect();
  if (directory) rmSync(directory, { recursive: true, force: true });
});

describe("first-use demo data", () => {
  it("creates a coherent pilot roster and quizzes without using plaintext credentials", async () => {
    expect(await seedDemoData(db, firstUse)).toBe("created");
    expect(await db.class.count()).toBe(3);
    expect(await db.user.count()).toBe(65);
    expect(await db.teacherClass.count()).toBe(6);
    expect(await db.quiz.count()).toBe(4);
    expect(await db.question.count()).toBe(47);
    expect(await db.option.count()).toBe(188);
    expect(await db.attempt.count()).toBe(6);
    expect(await db.answer.count()).toBe(81);

    for (const className of ["10A", "10B", "11A"]) {
      expect(
        await db.user.count({
          where: { role: "STUDENT", class: { name: className } },
        }),
      ).toBe(20);
    }
    for (const [username, password] of [
      ["admin", demoPasswords.admin],
      ["teacher.math", demoPasswords.teacher],
      ["student.10a.01", demoPasswords.student],
    ]) {
      const user = await db.user.findUniqueOrThrow({ where: { username } });
      expect(user.passwordHash).not.toBe(password);
      expect(await verifyPassword(password, user.passwordHash)).toBe(true);
      expect(await verifyPassword("wrong password", user.passwordHash)).toBe(
        false,
      );
    }
    expect(await verifyPassword("anything", "not-a-hash")).toBe(false);

    const published = await db.quiz.findMany({
      where: { status: "PUBLISHED" },
      include: { questions: true },
    });
    expect(published).toHaveLength(3);
    for (const quiz of published) {
      expect(quiz.questions).toHaveLength(15);
      expect(quiz.opensAt?.toISOString()).toBe("2031-06-01T10:00:00.000Z");
      expect(quiz.closesAt?.toISOString()).toBe("2031-06-15T12:00:00.000Z");
    }
    const draft = await db.quiz.findUniqueOrThrow({
      where: { code: "history-10a-draft" },
    });
    expect(draft.status).toBe("DRAFT");
    expect(draft.opensAt).toBeNull();

    // The main walkthrough student can still start a fresh attempt later.
    expect(
      await db.attempt.count({
        where: { student: { username: "student.10a.01" } },
      }),
    ).toBe(0);
    const perfect = await db.attempt.findUniqueOrThrow({
      where: {
        studentId_quizId: {
          studentId: "demo-user-student.10a.02",
          quizId: "demo-quiz-math-10a-demo",
        },
      },
    });
    expect([
      perfect.scoreHundredths,
      perfect.maxScoreHundredths,
      perfect.correctCount,
    ]).toEqual([1800, 1800, 15]);
    const partial = await db.attempt.findUniqueOrThrow({
      where: {
        studentId_quizId: {
          studentId: "demo-user-student.10a.03",
          quizId: "demo-quiz-math-10a-demo",
        },
      },
    });
    // Hand-calculated: 900 correct - 25% of 500 wrong = 775 hundredths.
    expect([
      partial.scoreHundredths,
      partial.correctCount,
      partial.incorrectCount,
      partial.unansweredCount,
    ]).toEqual([775, 8, 4, 3]);
  }, 30_000);

  it("does not overwrite edited data or extend deadlines on later runs", async () => {
    expect(await seedDemoData(db, firstUse)).toBe("created");
    const customClose = new Date("2031-06-02T12:00:00.000Z");
    await db.quiz.update({
      where: { code: "math-10a-demo" },
      data: { title: "Edited title", closesAt: customClose },
    });
    expect(await seedDemoData(db, new Date("2032-01-01T00:00:00Z"))).toBe(
      "existing",
    );
    expect(await db.seedRun.count()).toBe(1);
    expect(await db.user.count()).toBe(65);
    expect(await db.attempt.count()).toBe(6);
    const quiz = await db.quiz.findUniqueOrThrow({
      where: { code: "math-10a-demo" },
    });
    expect(quiz.title).toBe("Edited title");
    expect(quiz.closesAt?.toISOString()).toBe(customClose.toISOString());
    expect(
      (
        await db.seedRun.findUniqueOrThrow({ where: { id: demoSeedId } })
      ).initializedAt.toISOString(),
    ).toBe(firstUse.toISOString());
  }, 30_000);

  it("rejects unmarked existing data without leaving a partial seed", async () => {
    await db.class.create({ data: { name: "Existing class" } });
    await expect(seedDemoData(db, firstUse)).rejects.toThrow(
      "existing records",
    );
    expect(await db.seedRun.count()).toBe(0);
    expect(await db.class.count()).toBe(1);
    expect(await db.user.count()).toBe(0);
    expect(await db.quiz.count()).toBe(0);
  }, 30_000);

  it("exposes a repeat-safe seed command against the same migrated database", async () => {
    await db.$disconnect();
    expect(runScript("scripts/seed.ts", url)).toContain("initialized");
    expect(runScript("scripts/seed.ts", url)).toContain("already initialized");
    db = await createDatabaseClient(url);
    expect(await db.user.count()).toBe(65);
    expect(await db.seedRun.count()).toBe(1);
  }, 30_000);
});
