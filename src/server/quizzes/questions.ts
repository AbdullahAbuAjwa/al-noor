import type { Prisma } from "../../generated/prisma/client";
import type { Database } from "../db/types";

export type QuestionInput = {
  text: string;
  pointsHundredths: number;
  options: [string, string, string, string];
  correctPosition: number;
};

export type QuestionField = "text" | "points" | "options" | "correct";

export type QuestionResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "locked" | "limit" };

export const maxQuestions = 200;
// Newlines and tabs are fine in a question; other control characters are not.
const unsafeText = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const unsafeOption = /[\u0000-\u001F\u007F]/;

// Same limits as the CSV/XLSX importer (D21) and the database checks (D17).
export function parseQuestion(
  form: URLSearchParams,
): { ok: true; value: QuestionInput } | { ok: false; field: QuestionField } {
  const text = (form.get("text") ?? "").replaceAll("\r\n", "\n").trim();
  if (!text || text.length > 500 || unsafeText.test(text)) {
    return { ok: false, field: "text" };
  }

  const points = (form.get("points") ?? "").trim();
  const pointsHundredths = Math.round(Number(points) * 100);
  if (
    !/^(0|[1-9]\d{0,3})(\.\d{1,2})?$/.test(points) ||
    pointsHundredths < 1 ||
    pointsHundredths > 100_000
  ) {
    return { ok: false, field: "points" };
  }

  const options = [1, 2, 3, 4].map((number) =>
    (form.get(`option${number}`) ?? "").trim(),
  ) as QuestionInput["options"];
  if (
    options.some(
      (option) => !option || option.length > 200 || unsafeOption.test(option),
    ) ||
    new Set(options.map((option) => option.toLocaleLowerCase())).size !== 4
  ) {
    return { ok: false, field: "options" };
  }

  const correct = form.get("correctOption") ?? "";
  if (!/^[1-4]$/.test(correct)) return { ok: false, field: "correct" };

  return {
    ok: true,
    value: {
      text,
      pointsHundredths,
      options,
      correctPosition: Number(correct),
    },
  };
}

// Touching the quiz first takes SQLite's write lock and confirms, in the same
// transaction, that the caller owns it and that it is still a draft (D04).
async function lockOwnDraft(
  tx: Prisma.TransactionClient,
  teacherId: string,
  quizId: string,
): Promise<"ok" | "not_found" | "locked"> {
  const touched = await tx.quiz.updateMany({
    where: { id: quizId, teacherId, status: "DRAFT" },
    data: { updatedAt: new Date() },
  });
  if (touched.count === 1) return "ok";
  const owned = await tx.quiz.findFirst({
    where: { id: quizId, teacherId },
    select: { id: true },
  });
  return owned ? "locked" : "not_found";
}

export async function addQuestion(
  db: Database,
  teacherId: string,
  quizId: string,
  input: QuestionInput,
): Promise<QuestionResult> {
  return db.$transaction(async (tx) => {
    const lock = await lockOwnDraft(tx, teacherId, quizId);
    if (lock !== "ok") return { ok: false, reason: lock };
    const count = await tx.question.count({ where: { quizId } });
    if (count >= maxQuestions) return { ok: false, reason: "limit" };
    await tx.question.create({
      data: {
        quizId,
        position: count + 1,
        text: input.text,
        pointsHundredths: input.pointsHundredths,
        correctOptionPosition: input.correctPosition,
        options: {
          create: input.options.map((text, index) => ({
            position: index + 1,
            text,
          })),
        },
      },
    });
    return { ok: true };
  });
}

export async function updateQuestion(
  db: Database,
  teacherId: string,
  quizId: string,
  questionId: string,
  input: QuestionInput,
): Promise<QuestionResult> {
  return db.$transaction(async (tx) => {
    const lock = await lockOwnDraft(tx, teacherId, quizId);
    if (lock !== "ok") return { ok: false, reason: lock };
    // The question must belong to this quiz, not merely exist.
    const updated = await tx.question.updateMany({
      where: { id: questionId, quizId },
      data: {
        text: input.text,
        pointsHundredths: input.pointsHundredths,
        correctOptionPosition: input.correctPosition,
      },
    });
    if (updated.count === 0) return { ok: false, reason: "not_found" };
    for (const [index, text] of input.options.entries()) {
      await tx.option.updateMany({
        where: { questionId, position: index + 1 },
        data: { text },
      });
    }
    return { ok: true };
  });
}

export async function deleteQuestion(
  db: Database,
  teacherId: string,
  quizId: string,
  questionId: string,
): Promise<QuestionResult> {
  return db.$transaction(async (tx) => {
    const lock = await lockOwnDraft(tx, teacherId, quizId);
    if (lock !== "ok") return { ok: false, reason: lock };
    const question = await tx.question.findFirst({
      where: { id: questionId, quizId },
      select: { position: true },
    });
    if (!question) return { ok: false, reason: "not_found" };
    await tx.question.delete({ where: { id: questionId } });
    // Keep positions consecutive; ascending order never collides with the
    // unique (quiz, position) constraint because the deleted slot is free.
    const later = await tx.question.findMany({
      where: { quizId, position: { gt: question.position } },
      orderBy: { position: "asc" },
      select: { id: true, position: true },
    });
    for (const entry of later) {
      await tx.question.update({
        where: { id: entry.id },
        data: { position: entry.position - 1 },
      });
    }
    return { ok: true };
  });
}

// Callers must already have confirmed that the teacher owns the quiz.
export async function listQuizQuestions(db: Database, quizId: string) {
  return db.question.findMany({
    where: { quizId },
    orderBy: { position: "asc" },
    select: {
      id: true,
      position: true,
      text: true,
      pointsHundredths: true,
      correctOptionPosition: true,
      options: {
        orderBy: { position: "asc" },
        select: { position: true, text: true },
      },
    },
  });
}
