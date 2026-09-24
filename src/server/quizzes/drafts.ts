import { randomBytes } from "node:crypto";
import { Prisma } from "../../generated/prisma/client";
import type { Database } from "../db/types";

export type DraftSettings = {
  title: string;
  classIds: string[];
  durationMinutes: number;
  penaltyBps: number;
};

export type DraftField = "title" | "classes" | "duration" | "penalty";

export type DraftResult =
  | { ok: true; quizId: string }
  | { ok: false; reason: "classes" | "not_found" | "locked" };

const controlCharacters = /[\u0000-\u001F\u007F]/;
const idPattern = /^[A-Za-z0-9_-]{1,64}$/;

// Server-side validation is authoritative; the form's HTML limits only help.
export function parseDraftSettings(
  form: URLSearchParams,
): { ok: true; value: DraftSettings } | { ok: false; field: DraftField } {
  const title = (form.get("title") ?? "").trim();
  if (!title || title.length > 120 || controlCharacters.test(title)) {
    return { ok: false, field: "title" };
  }

  const classIds = form.getAll("classId");
  if (
    classIds.length === 0 ||
    classIds.length > 20 ||
    new Set(classIds).size !== classIds.length ||
    classIds.some((id) => !idPattern.test(id))
  ) {
    return { ok: false, field: "classes" };
  }

  const duration = (form.get("durationMinutes") ?? "").trim();
  if (!/^[1-9]\d{0,2}$/.test(duration) || Number(duration) > 180) {
    return { ok: false, field: "duration" };
  }

  // Percent of a question's points, at most two decimals (stored as basis points).
  const penalty = (form.get("penaltyPercent") ?? "").trim();
  const penaltyBps = Math.round(Number(penalty) * 100);
  if (!/^(0|[1-9]\d{0,2})(\.\d{1,2})?$/.test(penalty) || penaltyBps > 10_000) {
    return { ok: false, field: "penalty" };
  }

  return {
    ok: true,
    value: {
      title,
      classIds,
      durationMinutes: Number(duration),
      penaltyBps,
    },
  };
}

// Readable, unique, and in the same format the CSV/XLSX importer accepts.
function generateQuizCode() {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(8);
  return `quiz-${Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("")}`;
}

async function teachesAll(
  tx: Prisma.TransactionClient,
  teacherId: string,
  classIds: string[],
) {
  const taught = await tx.teacherClass.count({
    where: { teacherId, classId: { in: classIds } },
  });
  return taught === classIds.length;
}

class ClassesNotTaught extends Error {}

export async function createDraft(
  db: Database,
  teacherId: string,
  settings: DraftSettings,
): Promise<DraftResult> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await db.$transaction(async (tx) => {
        if (!(await teachesAll(tx, teacherId, settings.classIds))) {
          return { ok: false, reason: "classes" } as const;
        }
        const quiz = await tx.quiz.create({
          data: {
            code: generateQuizCode(),
            teacherId,
            title: settings.title,
            status: "DRAFT",
            durationMinutes: settings.durationMinutes,
            penaltyBps: settings.penaltyBps,
            classes: {
              create: settings.classIds.map((classId) => ({ classId })),
            },
          },
          select: { id: true },
        });
        return { ok: true, quizId: quiz.id } as const;
      });
    } catch (error) {
      // A random code collision is retried; any other failure propagates.
      const duplicate =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002";
      if (!duplicate || attempt >= 3) throw error;
    }
  }
}

// Only the owner may edit, and only while the quiz is a draft (D04). The
// conditional update takes the write lock first, so publication cannot slip in
// between the status check and the change.
export async function updateDraftSettings(
  db: Database,
  teacherId: string,
  quizId: string,
  settings: DraftSettings,
): Promise<DraftResult> {
  try {
    return await db.$transaction(async (tx) => {
      const updated = await tx.quiz.updateMany({
        where: { id: quizId, teacherId, status: "DRAFT" },
        data: {
          title: settings.title,
          durationMinutes: settings.durationMinutes,
          penaltyBps: settings.penaltyBps,
        },
      });
      if (updated.count === 0) {
        const owned = await tx.quiz.findFirst({
          where: { id: quizId, teacherId },
          select: { id: true },
        });
        return { ok: false, reason: owned ? "locked" : "not_found" } as const;
      }
      if (!(await teachesAll(tx, teacherId, settings.classIds))) {
        throw new ClassesNotTaught();
      }
      await tx.quizClass.deleteMany({ where: { quizId } });
      await tx.quizClass.createMany({
        data: settings.classIds.map((classId) => ({ quizId, classId })),
      });
      return { ok: true, quizId } as const;
    });
  } catch (error) {
    if (error instanceof ClassesNotTaught)
      return { ok: false, reason: "classes" };
    throw error;
  }
}

export async function listTaughtClasses(db: Database, teacherId: string) {
  const rows = await db.teacherClass.findMany({
    where: { teacherId },
    select: { class: { select: { id: true, name: true } } },
    orderBy: { class: { name: "asc" } },
  });
  return rows.map((row) => row.class);
}

export async function getTeacherQuiz(
  db: Database,
  teacherId: string,
  quizId: string,
) {
  if (!idPattern.test(quizId)) return null;
  const quiz = await db.quiz.findFirst({
    where: { id: quizId, teacherId },
    select: {
      id: true,
      code: true,
      title: true,
      status: true,
      durationMinutes: true,
      penaltyBps: true,
      opensAt: true,
      closesAt: true,
      classes: { select: { class: { select: { id: true, name: true } } } },
      _count: { select: { questions: true } },
    },
  });
  if (!quiz) return null;
  const { classes, _count, ...rest } = quiz;
  return {
    ...rest,
    classes: classes
      .map((entry) => entry.class)
      .sort((a, b) => a.name.localeCompare(b.name)),
    questionCount: _count.questions,
  };
}
