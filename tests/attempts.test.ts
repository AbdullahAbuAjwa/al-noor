import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  attemptDeadline,
  getAttemptView,
  getStudentQuiz,
  startAttempt,
  type Student,
} from "../src/server/attempts/attempts";
import type { Database } from "../src/server/db/types";
import { seededDatabaseFixture } from "./helpers/seeded-database";

// Seed (D20): published quizzes open 2 h before and close 14 days after the
// seed time, last 20 minutes, and have 15 questions worth 18 points in total.
const seededAt = new Date("2031-03-01T08:00:00.000Z");
const opensAt = new Date("2031-03-01T06:00:00.000Z");
const closesAt = new Date("2031-03-15T08:00:00.000Z");
const mathQuiz = "demo-quiz-math-10a-demo";
const historyDraft = "demo-quiz-history-10a-draft";
const minutes = (count: number) => count * 60_000;
const at = (base: Date, ms: number) => new Date(base.getTime() + ms);

const database = seededDatabaseFixture(seededAt);
let db: Database;

beforeAll(() => database.setup(), 60_000);
afterAll(() => database.cleanup());
beforeEach(async () => {
  db = await database.open();
});
afterEach(() => database.close(db));

async function student(username: string): Promise<Student> {
  return db.user.findUniqueOrThrow({
    where: { username },
    select: { id: true, classId: true },
  });
}

describe("attempt deadline", () => {
  it("is the full duration unless the quiz closes first", () => {
    const start = new Date("2031-03-01T09:00:00.000Z");
    expect(attemptDeadline(start, 20, closesAt)).toEqual(at(start, minutes(20)));
    const late = at(closesAt, -minutes(5));
    expect(attemptDeadline(late, 20, closesAt)).toEqual(closesAt);
  });
});

describe("starting and resuming an attempt", () => {
  it("creates one attempt with a persisted deadline, then resumes it unchanged", async () => {
    const ali = await student("student.10a.01");
    const now = new Date("2031-03-01T09:00:00.000Z");
    const first = await startAttempt(db, ali, mathQuiz, now);
    expect(first).toMatchObject({ ok: true, resumed: false });
    if (!first.ok) return;

    const stored = await db.attempt.findUniqueOrThrow({ where: { id: first.attemptId } });
    expect(stored).toMatchObject({
      studentId: ali.id,
      quizId: mathQuiz,
      status: "IN_PROGRESS",
      startedAt: now,
      deadlineAt: at(now, minutes(20)),
    });

    // Refreshing, a second tab, or signing in again five minutes later.
    const again = await startAttempt(db, ali, mathQuiz, at(now, minutes(5)));
    expect(again).toEqual({ ok: true, attemptId: first.attemptId, resumed: true });
    expect(
      (await db.attempt.findUniqueOrThrow({ where: { id: first.attemptId } })).deadlineAt,
    ).toEqual(at(now, minutes(20)));
    expect(await db.attempt.count({ where: { studentId: ali.id } })).toBe(1);
  });

  it("gives a late starter only the time left before the quiz closes", async () => {
    const ali = await student("student.10a.01");
    const late = at(closesAt, -minutes(5));
    expect((await getStudentQuiz(db, ali, mathQuiz, late))?.availableMinutes).toBe(5);
    const result = await startAttempt(db, ali, mathQuiz, late);
    if (!result.ok) throw new Error(result.reason);
    expect(
      (await db.attempt.findUniqueOrThrow({ where: { id: result.attemptId } })).deadlineAt,
    ).toEqual(closesAt);
  });

  it("refuses other classes, drafts, and quizzes outside their window", async () => {
    const tenA = await student("student.10a.01");
    const tenB = await student("student.10b.01");
    const now = new Date("2031-03-01T09:00:00.000Z");
    expect(await startAttempt(db, tenB, mathQuiz, now)).toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(await startAttempt(db, tenA, historyDraft, now)).toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(await startAttempt(db, tenA, mathQuiz, at(opensAt, -1))).toEqual({
      ok: false,
      reason: "upcoming",
    });
    // Closing is exclusive: no new attempt at the closing instant.
    expect(await startAttempt(db, tenA, mathQuiz, closesAt)).toEqual({
      ok: false,
      reason: "closed",
    });
    expect(await getStudentQuiz(db, tenB, mathQuiz, now)).toBeNull();
    expect(await getStudentQuiz(db, tenA, historyDraft, now)).toBeNull();
    expect(await db.attempt.count({ where: { studentId: { in: [tenA.id, tenB.id] } } })).toBe(0);
  });

  it("returns an already submitted attempt instead of starting another", async () => {
    // The seed gives student 02 of each class a submitted attempt.
    const done = await student("student.10a.02");
    const result = await startAttempt(db, done, mathQuiz, new Date("2031-03-01T09:00:00.000Z"));
    expect(result).toMatchObject({ ok: true, resumed: true });
    expect(await db.attempt.count({ where: { studentId: done.id } })).toBe(1);
    const view = await getAttemptView(db, done.id, mathQuiz, new Date("2031-03-01T09:00:00.000Z"));
    expect(view?.status).toBe("SUBMITTED");
  });

  it("creates exactly one attempt when two requests start at the same moment", async () => {
    const second = await database.connectAgain();
    try {
      const ali = await student("student.10a.01");
      const now = new Date("2031-03-01T09:00:00.000Z");
      const results = await Promise.all([
        startAttempt(db, ali, mathQuiz, now),
        startAttempt(second, ali, mathQuiz, now),
      ]);
      const ids = results.map((result) => (result.ok ? result.attemptId : null));
      expect(ids[0]).toBeTruthy();
      expect(ids[0]).toBe(ids[1]);
      expect(await db.attempt.count({ where: { studentId: ali.id } })).toBe(1);
    } finally {
      await second.$disconnect();
    }
  });
});

describe("the attempt page's data", () => {
  it("contains the questions but never the answer key", async () => {
    const ali = await student("student.10a.01");
    const now = new Date("2031-03-01T09:00:00.000Z");
    await startAttempt(db, ali, mathQuiz, now);
    const view = await getAttemptView(db, ali.id, mathQuiz, at(now, minutes(5)));
    expect(view).not.toBeNull();
    if (!view) return;
    expect(view.questions).toHaveLength(15);
    expect(view.questions.map((question) => question.position)).toEqual(
      Array.from({ length: 15 }, (_, index) => index + 1),
    );
    expect(view.questions.every((question) => question.options.length === 4)).toBe(true);
    expect(JSON.stringify(view)).not.toMatch(/correct/i);
    expect(view.remainingMs).toBe(minutes(15));
    expect(view.timeOver).toBe(false);

    const after = await getAttemptView(db, ali.id, mathQuiz, at(now, minutes(20)));
    expect(after).toMatchObject({ remainingMs: 0, timeOver: true });

    const other = await student("student.10a.04");
    expect(await getAttemptView(db, other.id, mathQuiz, now)).toBeNull();
  });

  it("summarizes the quiz for its instructions page", async () => {
    const ali = await student("student.10a.01");
    expect(await getStudentQuiz(db, ali, mathQuiz, new Date("2031-03-01T09:00:00.000Z"))).toMatchObject({
      questionCount: 15,
      totalPointsHundredths: 1_800,
      durationMinutes: 20,
      penaltyBps: 2_500,
      availability: "open",
      availableMinutes: 20,
      attempt: null,
    });
  });
});
