import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { saveAnswer } from "../src/server/attempts/answers";
import { startAttempt } from "../src/server/attempts/attempts";
import {
  expireOverdueAttempts,
  finalizeAttempt,
  gradeAnswers,
} from "../src/server/attempts/grading";
import { getQuizResults } from "../src/server/results/results";
import type { Database } from "../src/server/db/types";
import { seededDatabaseFixture } from "./helpers/seeded-database";

// Hand-built questions: points in hundredths, options named by letter.
function questions(points: number[]) {
  return points.map((pointsHundredths, index) => ({
    id: `q${index + 1}`,
    pointsHundredths,
    correctOptionId: `q${index + 1}-correct`,
  }));
}

describe("grading rules (D06), worked out by hand", () => {
  it("reproduces the seed's 7.75 of 18: 8 right, 4 wrong at 25%, 3 blank", () => {
    // Every fifth question is worth 2 points, the rest 1 (18 in total).
    const quiz = questions(
      Array.from({ length: 15 }, (_, i) => ((i + 1) % 5 === 0 ? 200 : 100)),
    );
    const answers: Record<string, string> = {};
    quiz.slice(0, 8).forEach((q) => (answers[q.id] = q.correctOptionId)); // 9 points
    quiz.slice(8, 12).forEach((q) => (answers[q.id] = "wrong")); // 1+2+1+1 = 5 points x 25%
    expect(gradeAnswers(quiz, answers, 2_500)).toEqual({
      scoreHundredths: 775, // 9 - 1.25
      maxScoreHundredths: 1_800,
      correctCount: 8,
      incorrectCount: 4,
      unansweredCount: 3,
    });
  });

  it("floors only the final total at zero, never each question", () => {
    // 1 right (+1) and 1 wrong worth 2 at 100% (-2): total -1 -> 0.
    const quiz = questions([100, 200]);
    expect(
      gradeAnswers(quiz, { q1: "q1-correct", q2: "wrong" }, 10_000)
        .scoreHundredths,
    ).toBe(0);
    // All wrong with a full penalty is still zero, not negative.
    expect(
      gradeAnswers(quiz, { q1: "x", q2: "y" }, 10_000).scoreHundredths,
    ).toBe(0);
  });

  it("counts blanks as zero and rounds the exact total once, half up", () => {
    expect(gradeAnswers(questions([100, 100]), {}, 5_000)).toMatchObject({
      scoreHundredths: 0,
      unansweredCount: 2,
    });
    // 1.00 - 25% of 1.50 = 0.625 -> 0.63.
    expect(
      gradeAnswers(
        questions([100, 150]),
        { q1: "q1-correct", q2: "wrong" },
        2_500,
      ).scoreHundredths,
    ).toBe(63);
    // Zero penalty: wrong answers cost nothing.
    expect(
      gradeAnswers(questions([100, 150]), { q1: "q1-correct", q2: "wrong" }, 0)
        .scoreHundredths,
    ).toBe(100);
  });
});

describe("submission, expiry, and results against the real database", () => {
  const database = seededDatabaseFixture(new Date("2031-03-01T08:00:00.000Z"));
  const mathQuiz = "demo-quiz-math-10a-demo";
  const startedAt = new Date("2031-03-01T09:00:00.000Z");
  const during = new Date("2031-03-01T09:05:00.000Z");
  const afterDeadline = new Date("2031-03-01T09:21:00.000Z");
  let db: Database;
  let student: { id: string; classId: string | null };

  beforeAll(() => database.setup(), 60_000);
  afterAll(() => database.cleanup());
  beforeEach(async () => {
    db = await database.open();
    student = await db.user.findUniqueOrThrow({
      where: { username: "student.10a.01" },
      select: { id: true, classId: true },
    });
    await startAttempt(db, student, mathQuiz, startedAt);
    // Q1 correct (1 point), Q2 wrong (1 point at 25%), the rest blank.
    const [q1, q2] = await db.question.findMany({
      where: { quizId: mathQuiz, position: { in: [1, 2] } },
      orderBy: { position: "asc" },
      select: { id: true, correctOptionPosition: true, options: true },
    });
    const pick = (q: typeof q1, correct: boolean) =>
      q.options.find(
        (o) => (o.position === q.correctOptionPosition) === correct,
      )!.id;
    await saveAnswer(db, student.id, mathQuiz, q1.id, pick(q1, true), during);
    await saveAnswer(db, student.id, mathQuiz, q2.id, pick(q2, false), during);
  });
  afterEach(() => database.close(db));

  const expected = {
    scoreHundredths: 75, // 1 - 0.25
    maxScoreHundredths: 1_800,
    correctCount: 1,
    incorrectCount: 1,
    unansweredCount: 13,
  };

  it("grades a submission once; repeats return the same stored result", async () => {
    const first = await finalizeAttempt(
      db,
      student.id,
      mathQuiz,
      during,
      "submit",
    );
    expect(first).toEqual({
      ok: true,
      result: { status: "SUBMITTED", finalizedAt: during, ...expected },
    });
    const again = await finalizeAttempt(
      db,
      student.id,
      mathQuiz,
      new Date("2031-03-01T09:06:00.000Z"),
      "submit",
    );
    expect(again).toEqual(first);
    // Answers are frozen after submission.
    const q3 = "demo-question-math-10a-demo-3";
    expect(
      await saveAnswer(
        db,
        student.id,
        mathQuiz,
        q3,
        "demo-option-math-10a-demo-3-1",
        during,
      ),
    ).toEqual({ ok: false, reason: "finished" });
  });

  it("marks a late submission or an unattended deadline as expired", async () => {
    expect(
      await finalizeAttempt(db, student.id, mathQuiz, during, "expire"),
    ).toEqual({ ok: false, reason: "not_due" });
    await expireOverdueAttempts(db, { quizId: mathQuiz }, afterDeadline);
    expect(
      await db.attempt.findUniqueOrThrow({
        where: {
          studentId_quizId: { studentId: student.id, quizId: mathQuiz },
        },
      }),
    ).toMatchObject({
      status: "EXPIRED",
      finalizedAt: afterDeadline,
      ...expected,
    });
  });

  it("gives the owner and the administrator full results, including non-starters", async () => {
    await finalizeAttempt(db, student.id, mathQuiz, during, "submit");
    const math = await db.user.findUniqueOrThrow({
      where: { username: "teacher.math" },
    });
    const science = await db.user.findUniqueOrThrow({
      where: { username: "teacher.science" },
    });
    expect(
      await getQuizResults(db, mathQuiz, afterDeadline, science.id),
    ).toBeNull();
    expect(
      await getQuizResults(
        db,
        "demo-quiz-history-10a-draft",
        afterDeadline,
        undefined,
      ),
    ).toBeNull();

    const results = await getQuizResults(db, mathQuiz, afterDeadline, math.id);
    expect(results?.rows).toHaveLength(20);
    const byUser = Object.fromEntries(
      results!.rows.map((row) => [row.username, row]),
    );
    // Seeded: student 02 has 18/18 and student 03 has 7.75/18 (D20).
    expect(byUser["student.10a.02"]).toMatchObject({
      status: "SUBMITTED",
      scoreHundredths: 1_800,
    });
    expect(byUser["student.10a.03"]).toMatchObject({
      status: "SUBMITTED",
      scoreHundredths: 775,
    });
    expect(byUser["student.10a.01"]).toMatchObject({
      status: "SUBMITTED",
      scoreHundredths: 75,
    });
    expect(byUser["student.10a.05"]).toMatchObject({
      status: "NOT_STARTED",
      scoreHundredths: null,
    });
    // (100% + 43.06% + 4.17%) / 3 = 49.07% -> 49.1
    expect(results?.summary).toEqual({
      assigned: 20,
      finished: 3,
      inProgress: 0,
      notStarted: 17,
      averagePercent: 49.1,
    });
    expect(await getQuizResults(db, mathQuiz, afterDeadline)).toMatchObject({
      summary: { finished: 3 },
    });
  });
});
