import type { AttemptStatus } from "../../generated/prisma/enums";
import type { Database } from "../db/types";

export type GradedQuestion = {
  id: string;
  pointsHundredths: number;
  correctOptionId: string;
};

export type Grade = {
  scoreHundredths: number;
  maxScoreHundredths: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
};

// D06: a correct answer earns the question's points, a wrong answer loses
// penaltyBps/10000 of them, a blank answer counts zero. The total is kept
// exact (points in hundredths x 10000), rounded once to hundredths (half up),
// and only then floored at zero, never per question.
export function gradeAnswers(
  questions: GradedQuestion[],
  answers: Record<string, string>,
  penaltyBps: number,
): Grade {
  let exact = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;
  let maxScoreHundredths = 0;
  for (const question of questions) {
    maxScoreHundredths += question.pointsHundredths;
    const chosen = answers[question.id];
    if (chosen === undefined) {
      unansweredCount += 1;
    } else if (chosen === question.correctOptionId) {
      correctCount += 1;
      exact += question.pointsHundredths * 10_000;
    } else {
      incorrectCount += 1;
      exact -= question.pointsHundredths * penaltyBps;
    }
  }
  const rounded = Math.floor((exact + 5_000) / 10_000);
  return {
    scoreHundredths: Math.max(0, rounded),
    maxScoreHundredths,
    correctCount,
    incorrectCount,
    unansweredCount,
  };
}

export type FinalResult = Grade & {
  status: Exclude<AttemptStatus, "IN_PROGRESS">;
  finalizedAt: Date;
};

// Finalizes the student's own attempt once: SUBMITTED if submitted before the
// deadline, EXPIRED otherwise (D07). Only answers saved before the deadline
// exist, because saving refuses later writes. Repeating the call returns the
// stored result unchanged, so retries and double clicks are harmless.
export async function finalizeAttempt(
  db: Database,
  studentId: string,
  quizId: string,
  now: Date,
  mode: "submit" | "expire",
): Promise<
  | { ok: true; result: FinalResult }
  | { ok: false; reason: "not_found" | "not_due" }
> {
  return db.$transaction(async (tx) => {
    // Lock first: a concurrent save or submit waits for this transaction.
    const locked = await tx.attempt.updateMany({
      where: {
        studentId,
        quizId,
        status: "IN_PROGRESS",
        ...(mode === "expire" ? { deadlineAt: { lte: now } } : {}),
      },
      data: { version: { increment: 1 } },
    });
    const attempt = await tx.attempt.findUnique({
      where: { studentId_quizId: { studentId, quizId } },
      select: {
        id: true,
        status: true,
        deadlineAt: true,
        finalizedAt: true,
        scoreHundredths: true,
        maxScoreHundredths: true,
        correctCount: true,
        incorrectCount: true,
        unansweredCount: true,
        answers: { select: { questionId: true, optionId: true } },
        quiz: {
          select: {
            penaltyBps: true,
            questions: {
              select: {
                id: true,
                pointsHundredths: true,
                correctOptionPosition: true,
                options: { select: { id: true, position: true } },
              },
            },
          },
        },
      },
    });
    if (!attempt) return { ok: false, reason: "not_found" } as const;
    if (locked.count === 0) {
      if (attempt.status === "IN_PROGRESS")
        return { ok: false, reason: "not_due" } as const;
      return {
        ok: true,
        result: {
          status: attempt.status,
          finalizedAt: attempt.finalizedAt!,
          scoreHundredths: attempt.scoreHundredths!,
          maxScoreHundredths: attempt.maxScoreHundredths!,
          correctCount: attempt.correctCount!,
          incorrectCount: attempt.incorrectCount!,
          unansweredCount: attempt.unansweredCount!,
        },
      } as const;
    }
    const grade = gradeAnswers(
      attempt.quiz.questions.map((question) => ({
        id: question.id,
        pointsHundredths: question.pointsHundredths,
        correctOptionId:
          question.options.find(
            (option) => option.position === question.correctOptionPosition,
          )?.id ?? "",
      })),
      Object.fromEntries(
        attempt.answers.map((answer) => [answer.questionId, answer.optionId]),
      ),
      attempt.quiz.penaltyBps,
    );
    const status =
      now.getTime() < attempt.deadlineAt.getTime() ? "SUBMITTED" : "EXPIRED";
    await tx.attempt.update({
      where: { id: attempt.id },
      data: { status, finalizedAt: now, ...grade },
    });
    return {
      ok: true,
      result: { status, finalizedAt: now, ...grade },
    } as const;
  });
}

// Attempts whose deadline passed without a submission are finalized from
// their saved answers the next time anyone looks at them (D07).
export async function expireOverdueAttempts(
  db: Database,
  where: { quizId?: string; studentId?: string },
  now: Date,
) {
  const overdue = await db.attempt.findMany({
    where: { ...where, status: "IN_PROGRESS", deadlineAt: { lte: now } },
    select: { studentId: true, quizId: true },
  });
  for (const attempt of overdue) {
    await finalizeAttempt(db, attempt.studentId, attempt.quizId, now, "expire");
  }
}
