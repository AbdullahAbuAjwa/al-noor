import type { AttemptStatus } from "../../generated/prisma/enums";
import { expireOverdueAttempts } from "../attempts/grading";
import type { Database } from "../db/types";

export type ResultRow = {
  studentName: string;
  username: string;
  className: string;
  status: AttemptStatus | "NOT_STARTED";
  scoreHundredths: number | null;
  maxScoreHundredths: number | null;
  correctCount: number | null;
  incorrectCount: number | null;
  unansweredCount: number | null;
};

export type QuizResults = {
  id: string;
  title: string;
  teacherName: string;
  classNames: string[];
  rows: ResultRow[];
  summary: {
    assigned: number;
    finished: number;
    inProgress: number;
    notStarted: number;
    // Mean of finished scores as a percentage of the maximum, or null.
    averagePercent: number | null;
  };
};

// Results for one published quiz: every student in its classes, including
// those who never started. Pass teacherId to restrict to the owner (teacher
// view); omit it for the centre administrator.
export async function getQuizResults(
  db: Database,
  quizId: string,
  now: Date,
  teacherId?: string,
): Promise<QuizResults | null> {
  const quiz = await db.quiz.findFirst({
    where: {
      id: quizId,
      status: "PUBLISHED",
      ...(teacherId ? { teacherId } : {}),
    },
    select: {
      id: true,
      title: true,
      teacher: { select: { name: true } },
      classes: { select: { classId: true, class: { select: { name: true } } } },
    },
  });
  if (!quiz) return null;
  // Never report an overdue attempt as still in progress (D07).
  await expireOverdueAttempts(db, { quizId }, now);

  const students = await db.user.findMany({
    where: {
      role: "STUDENT",
      classId: { in: quiz.classes.map((entry) => entry.classId) },
    },
    orderBy: [{ class: { name: "asc" } }, { username: "asc" }],
    select: {
      name: true,
      username: true,
      class: { select: { name: true } },
      attempts: {
        where: { quizId },
        select: {
          status: true,
          scoreHundredths: true,
          maxScoreHundredths: true,
          correctCount: true,
          incorrectCount: true,
          unansweredCount: true,
        },
      },
    },
  });
  const rows: ResultRow[] = students.map((student) => {
    const attempt = student.attempts[0];
    return {
      studentName: student.name,
      username: student.username,
      className: student.class?.name ?? "",
      status: attempt?.status ?? "NOT_STARTED",
      scoreHundredths: attempt?.scoreHundredths ?? null,
      maxScoreHundredths: attempt?.maxScoreHundredths ?? null,
      correctCount: attempt?.correctCount ?? null,
      incorrectCount: attempt?.incorrectCount ?? null,
      unansweredCount: attempt?.unansweredCount ?? null,
    };
  });
  const finished = rows.filter(
    (row) => row.status === "SUBMITTED" || row.status === "EXPIRED",
  );
  const averagePercent = finished.length
    ? Math.round(
        (finished.reduce(
          (sum, row) =>
            sum + (row.scoreHundredths ?? 0) / (row.maxScoreHundredths ?? 1),
          0,
        ) /
          finished.length) *
          1000,
      ) / 10
    : null;
  return {
    id: quiz.id,
    title: quiz.title,
    teacherName: quiz.teacher.name,
    classNames: quiz.classes.map((entry) => entry.class.name).sort(),
    rows,
    summary: {
      assigned: rows.length,
      finished: finished.length,
      inProgress: rows.filter((row) => row.status === "IN_PROGRESS").length,
      notStarted: rows.filter((row) => row.status === "NOT_STARTED").length,
      averagePercent,
    },
  };
}

// Published quizzes across the centre, for the administrator's overview.
export async function listPublishedQuizzes(db: Database) {
  return db.quiz.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ closesAt: "desc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      teacher: { select: { name: true } },
      classes: { select: { class: { select: { name: true } } } },
      _count: {
        select: {
          attempts: { where: { status: { in: ["SUBMITTED", "EXPIRED"] } } },
        },
      },
    },
  });
}
