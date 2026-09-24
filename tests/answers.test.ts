import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { saveAnswer } from "../src/server/attempts/answers";
import { getAttemptView, startAttempt } from "../src/server/attempts/attempts";
import type { Database } from "../src/server/db/types";
import { seededDatabaseFixture } from "./helpers/seeded-database";

// Seed ids (src/server/demo/seed.ts): demo-question-<quiz code>-<position> and
// demo-option-<quiz code>-<position>-<option>. Math quizzes last 20 minutes.
const mathQuiz = "demo-quiz-math-10a-demo";
const q1 = "demo-question-math-10a-demo-1";
const q2 = "demo-question-math-10a-demo-2";
const option = (question: number, choice: number) =>
  `demo-option-math-10a-demo-${question}-${choice}`;
const startedAt = new Date("2031-03-01T09:00:00.000Z");
const deadline = new Date("2031-03-01T09:20:00.000Z");
const during = new Date("2031-03-01T09:05:00.000Z");

const database = seededDatabaseFixture(new Date("2031-03-01T08:00:00.000Z"));
let db: Database;
let studentId: string;
let attemptId: string;

beforeAll(() => database.setup(), 60_000);
afterAll(() => database.cleanup());
beforeEach(async () => {
  db = await database.open();
  const student = await db.user.findUniqueOrThrow({
    where: { username: "student.10a.01" },
    select: { id: true, classId: true },
  });
  studentId = student.id;
  const started = await startAttempt(db, student, mathQuiz, startedAt);
  if (!started.ok) throw new Error(started.reason);
  attemptId = started.attemptId;
});
afterEach(() => database.close(db));

async function answers() {
  return db.answer.findMany({
    where: { attemptId },
    orderBy: { questionId: "asc" },
    select: { questionId: true, optionId: true },
  });
}

async function version() {
  return (await db.attempt.findUniqueOrThrow({ where: { id: attemptId } })).version;
}

describe("saving answers during an attempt", () => {
  it("saves, replaces, and clears one answer per question", async () => {
    expect(await saveAnswer(db, studentId, mathQuiz, q1, option(1, 3), during)).toEqual({
      ok: true,
      version: 1,
    });
    expect(await saveAnswer(db, studentId, mathQuiz, q1, option(1, 2), during)).toEqual({
      ok: true,
      version: 2,
    });
    await saveAnswer(db, studentId, mathQuiz, q2, option(2, 1), during);
    expect(await answers()).toEqual([
      { questionId: q1, optionId: option(1, 2) },
      { questionId: q2, optionId: option(2, 1) },
    ]);

    expect(await saveAnswer(db, studentId, mathQuiz, q1, null, during)).toEqual({
      ok: true,
      version: 4,
    });
    expect(await answers()).toEqual([{ questionId: q2, optionId: option(2, 1) }]);
  });

  it("restores saved answers when the attempt is reopened", async () => {
    await saveAnswer(db, studentId, mathQuiz, q2, option(2, 4), during);
    const view = await getAttemptView(db, studentId, mathQuiz, during);
    expect(view?.answers).toEqual({ [q2]: option(2, 4) });
  });

  it("rejects options from another question or quiz and writes nothing", async () => {
    for (const [question, choice] of [
      [q1, option(2, 1)], // an option of question 2
      ["demo-question-science-10b-demo-1", "demo-option-science-10b-demo-1-1"],
      [q1, "../../etc"],
      ["", option(1, 1)],
    ]) {
      expect(await saveAnswer(db, studentId, mathQuiz, question, choice, during)).toEqual({
        ok: false,
        reason: "invalid",
      });
    }
    expect(await answers()).toEqual([]);
    // The rejected requests rolled back their version change too.
    expect(await version()).toBe(0);
  });

  it("accepts answers until the deadline and none at or after it", async () => {
    const lastMoment = new Date(deadline.getTime() - 1);
    expect((await saveAnswer(db, studentId, mathQuiz, q1, option(1, 2), lastMoment)).ok).toBe(true);
    expect(await saveAnswer(db, studentId, mathQuiz, q1, option(1, 3), deadline)).toEqual({
      ok: false,
      reason: "time_over",
    });
    expect(await saveAnswer(db, studentId, mathQuiz, q1, null, deadline)).toEqual({
      ok: false,
      reason: "time_over",
    });
    expect(await answers()).toEqual([{ questionId: q1, optionId: option(1, 2) }]);
  });

  it("never changes a finished attempt or another student's attempt", async () => {
    // Student 02's seeded attempt is already submitted.
    const done = await db.user.findUniqueOrThrow({ where: { username: "student.10a.02" } });
    const doneAttempt = await db.attempt.findUniqueOrThrow({
      where: { studentId_quizId: { studentId: done.id, quizId: mathQuiz } },
      include: { answers: true },
    });
    expect(await saveAnswer(db, done.id, mathQuiz, q1, option(1, 1), during)).toEqual({
      ok: false,
      reason: "finished",
    });
    expect(
      await db.attempt.findUniqueOrThrow({
        where: { id: doneAttempt.id },
        include: { answers: true },
      }),
    ).toEqual(doneAttempt);

    // A student without an attempt cannot reach anyone else's.
    const other = await db.user.findUniqueOrThrow({ where: { username: "student.10a.07" } });
    expect(await saveAnswer(db, other.id, mathQuiz, q1, option(1, 1), during)).toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(await answers()).toEqual([]);
  });

  it("keeps exactly one answer when two saves for a question arrive together", async () => {
    // Like the server: one shared connection per process, whose transactions
    // Prisma runs one at a time (D18). Two connections inside one process
    // would deadlock in better-sqlite3's synchronous lock wait instead.
    const results = await Promise.all([
      saveAnswer(db, studentId, mathQuiz, q1, option(1, 1), during),
      saveAnswer(db, studentId, mathQuiz, q1, option(1, 4), during),
    ]);
    expect(results.every((result) => result.ok)).toBe(true);
    const saved = await answers();
    expect(saved).toHaveLength(1);
    expect([option(1, 1), option(1, 4)]).toContain(saved[0].optionId);
    expect(await version()).toBe(2);
  });
});
