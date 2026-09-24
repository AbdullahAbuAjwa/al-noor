import type { Prisma } from "../../generated/prisma/client";
import type { Database } from "../db/types";
import { zonedInputToDate } from "../time/zone";

export type WindowField =
  | "confirm"
  | "windowFormat"
  | "windowOrder"
  | "windowPast";

export type PublishFailure =
  | "not_found"
  | "locked"
  | "noQuestions"
  | "incompleteQuestions"
  | "publishClasses"
  | "windowShort";

// Default form values: from the next five-minute mark on the server clock,
// open for one week. The teacher can change both before publishing.
export function suggestedWindow(now = new Date()) {
  const opensAt = new Date(Math.ceil(now.getTime() / 300_000) * 300_000);
  return {
    opensAt,
    closesAt: new Date(opensAt.getTime() + 7 * 24 * 3_600_000),
  };
}

// The teacher types Amman wall-clock times; they are stored as UTC instants.
export function parsePublication(
  form: URLSearchParams,
  now: Date,
):
  | { ok: true; opensAt: Date; closesAt: Date }
  | { ok: false; field: WindowField } {
  if (form.get("confirm") !== "yes") return { ok: false, field: "confirm" };
  const opensAt = zonedInputToDate(form.get("opensAt") ?? "");
  const closesAt = zonedInputToDate(form.get("closesAt") ?? "");
  if (!opensAt || !closesAt) return { ok: false, field: "windowFormat" };
  if (closesAt.getTime() <= opensAt.getTime()) {
    return { ok: false, field: "windowOrder" };
  }
  // Publishing a window that has already closed would help nobody.
  if (closesAt.getTime() <= now.getTime())
    return { ok: false, field: "windowPast" };
  return { ok: true, opensAt, closesAt };
}

type QuizContent = {
  durationMinutes: number;
  teacherId: string;
  classes: { classId: string }[];
  questions: {
    position: number;
    pointsHundredths: number;
    correctOptionPosition: number;
    text: string;
    options: { position: number; text: string }[];
  }[];
};

// The complete draft must be takeable before it is fixed forever (D04).
// Most rules are also database checks; this gives the teacher a clear reason.
export async function publicationProblem(
  tx: Prisma.TransactionClient,
  quiz: QuizContent,
  opensAt: Date,
  closesAt: Date,
): Promise<PublishFailure | null> {
  if (quiz.questions.length === 0) return "noQuestions";
  const ordered = [...quiz.questions].sort((a, b) => a.position - b.position);
  const complete = ordered.every((question, index) => {
    const positions = question.options.map((option) => option.position).sort();
    return (
      question.position === index + 1 &&
      question.text.trim() !== "" &&
      question.pointsHundredths >= 1 &&
      question.correctOptionPosition >= 1 &&
      question.correctOptionPosition <= 4 &&
      positions.join(",") === "1,2,3,4" &&
      question.options.every((option) => option.text.trim() !== "")
    );
  });
  if (!complete) return "incompleteQuestions";

  // The teacher must still teach every assigned class when publishing.
  const classIds = quiz.classes.map((entry) => entry.classId);
  const taught = await tx.teacherClass.count({
    where: { teacherId: quiz.teacherId, classId: { in: classIds } },
  });
  if (classIds.length === 0 || taught !== classIds.length)
    return "publishClasses";

  // Everyone who starts at opening must be able to use the full duration.
  const windowMinutes = (closesAt.getTime() - opensAt.getTime()) / 60_000;
  if (windowMinutes < quiz.durationMinutes) return "windowShort";
  return null;
}

export async function publishQuiz(
  db: Database,
  teacherId: string,
  quizId: string,
  window: { opensAt: Date; closesAt: Date },
): Promise<{ ok: true } | { ok: false; reason: PublishFailure }> {
  return db.$transaction(async (tx) => {
    // Take the write lock first: no question or setting can change between
    // validation and the status change below.
    const touched = await tx.quiz.updateMany({
      where: { id: quizId, teacherId, status: "DRAFT" },
      data: { updatedAt: new Date() },
    });
    if (touched.count === 0) {
      const owned = await tx.quiz.findFirst({
        where: { id: quizId, teacherId },
        select: { id: true },
      });
      return { ok: false, reason: owned ? "locked" : "not_found" } as const;
    }
    const quiz = await tx.quiz.findUniqueOrThrow({
      where: { id: quizId },
      select: {
        durationMinutes: true,
        teacherId: true,
        classes: { select: { classId: true } },
        questions: {
          select: {
            position: true,
            pointsHundredths: true,
            correctOptionPosition: true,
            text: true,
            options: { select: { position: true, text: true } },
          },
        },
      },
    });
    const problem = await publicationProblem(
      tx,
      quiz,
      window.opensAt,
      window.closesAt,
    );
    if (problem) return { ok: false, reason: problem } as const;
    await tx.quiz.update({
      where: { id: quizId },
      data: {
        status: "PUBLISHED",
        opensAt: window.opensAt,
        closesAt: window.closesAt,
      },
    });
    return { ok: true } as const;
  });
}
