import type { Database } from "../db/types";

export type SaveResult =
  | { ok: true; version: number }
  | { ok: false; reason: "not_found" | "finished" | "time_over" | "invalid" };

const idPattern = /^[A-Za-z0-9_-]{1,64}$/;

class InvalidAnswer extends Error {}

// Saves (or, with optionId null, clears) one answer in the student's own
// attempt. The first statement is a conditional write that only matches an
// attempt that is theirs, still in progress, and before its deadline on the
// server clock; it takes SQLite's write lock, so finalization or expiry
// cannot interleave with the answer change (D07). Client timestamps are never
// consulted.
export async function saveAnswer(
  db: Database,
  studentId: string,
  quizId: string,
  questionId: string,
  optionId: string | null,
  now: Date,
): Promise<SaveResult> {
  if (
    !idPattern.test(questionId) ||
    (optionId !== null && !idPattern.test(optionId))
  ) {
    return { ok: false, reason: "invalid" };
  }
  try {
    return await db.$transaction(async (tx) => {
      const touched = await tx.attempt.updateMany({
        where: {
          studentId,
          quizId,
          status: "IN_PROGRESS",
          deadlineAt: { gt: now },
        },
        data: { version: { increment: 1 } },
      });
      const attempt = await tx.attempt.findUnique({
        where: { studentId_quizId: { studentId, quizId } },
        select: { id: true, status: true, version: true },
      });
      if (touched.count === 0) {
        if (!attempt) return { ok: false, reason: "not_found" } as const;
        return {
          ok: false,
          reason: attempt.status === "IN_PROGRESS" ? "time_over" : "finished",
        } as const;
      }
      if (!attempt)
        throw new Error("Attempt disappeared inside its transaction.");

      // The question must belong to this quiz and the option to that question.
      // Composite foreign keys enforce the same rule in the database (D17).
      const question = await tx.question.findFirst({
        where: { id: questionId, quizId },
        select: { id: true },
      });
      if (!question) throw new InvalidAnswer();
      if (optionId === null) {
        await tx.answer.deleteMany({
          where: { attemptId: attempt.id, questionId },
        });
      } else {
        const option = await tx.option.findFirst({
          where: { id: optionId, questionId },
          select: { id: true },
        });
        if (!option) throw new InvalidAnswer();
        await tx.answer.upsert({
          where: {
            attemptId_questionId: { attemptId: attempt.id, questionId },
          },
          create: { attemptId: attempt.id, questionId, quizId, optionId },
          update: { optionId },
        });
      }
      return { ok: true, version: attempt.version } as const;
    });
  } catch (error) {
    // Throwing rolls back the version change made above.
    if (error instanceof InvalidAnswer) return { ok: false, reason: "invalid" };
    throw error;
  }
}
