import type { AttemptStatus, QuizStatus } from "../../generated/prisma/enums";
import type { Database } from "../db/types";
import { quizAvailability, type Availability } from "../quizzes/availability";

export type StudentQuizSummary = {
  id: string;
  title: string;
  teacherName: string;
  opensAt: Date;
  closesAt: Date;
  durationMinutes: number;
  penaltyBps: number;
  questionCount: number;
  availability: Availability;
  attemptStatus: AttemptStatus | null;
};

// A student sees only published quizzes assigned to their own class.
export async function listStudentQuizzes(
  db: Database,
  student: { id: string; classId: string | null },
  now: Date,
): Promise<StudentQuizSummary[]> {
  if (!student.classId) return [];
  const quizzes = await db.quiz.findMany({
    where: {
      status: "PUBLISHED",
      classes: { some: { classId: student.classId } },
    },
    orderBy: [{ closesAt: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      opensAt: true,
      closesAt: true,
      durationMinutes: true,
      penaltyBps: true,
      teacher: { select: { name: true } },
      _count: { select: { questions: true } },
      attempts: { where: { studentId: student.id }, select: { status: true } },
    },
  });
  return quizzes.flatMap((quiz) => {
    // The database requires a window for published quizzes; skip defensively.
    if (!quiz.opensAt || !quiz.closesAt) return [];
    return [
      {
        id: quiz.id,
        title: quiz.title,
        teacherName: quiz.teacher.name,
        opensAt: quiz.opensAt,
        closesAt: quiz.closesAt,
        durationMinutes: quiz.durationMinutes,
        penaltyBps: quiz.penaltyBps,
        questionCount: quiz._count.questions,
        availability: quizAvailability(quiz.opensAt, quiz.closesAt, now),
        attemptStatus: quiz.attempts[0]?.status ?? null,
      },
    ];
  });
}

export type TeacherQuizSummary = {
  id: string;
  code: string;
  title: string;
  status: QuizStatus;
  classNames: string[];
  opensAt: Date | null;
  closesAt: Date | null;
  durationMinutes: number;
  penaltyBps: number;
  questionCount: number;
  finishedAttempts: number;
};

// A teacher sees only quizzes they own.
export async function listTeacherQuizzes(
  db: Database,
  teacherId: string,
): Promise<TeacherQuizSummary[]> {
  const quizzes = await db.quiz.findMany({
    where: { teacherId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      code: true,
      title: true,
      status: true,
      opensAt: true,
      closesAt: true,
      durationMinutes: true,
      penaltyBps: true,
      classes: { select: { class: { select: { name: true } } } },
      _count: {
        select: {
          questions: true,
          attempts: { where: { status: { in: ["SUBMITTED", "EXPIRED"] } } },
        },
      },
    },
  });
  return quizzes.map((quiz) => ({
    id: quiz.id,
    code: quiz.code,
    title: quiz.title,
    status: quiz.status,
    classNames: quiz.classes.map((entry) => entry.class.name).sort(),
    opensAt: quiz.opensAt,
    closesAt: quiz.closesAt,
    durationMinutes: quiz.durationMinutes,
    penaltyBps: quiz.penaltyBps,
    questionCount: quiz._count.questions,
    finishedAttempts: quiz._count.attempts,
  }));
}

export type CenterOverview = {
  students: number;
  teachers: number;
  publishedQuizzes: number;
  draftQuizzes: number;
  finishedAttempts: number;
  classes: { name: string; students: number }[];
};

export async function getCenterOverview(db: Database): Promise<CenterOverview> {
  const [students, teachers, published, drafts, finished, classes] =
    await Promise.all([
      db.user.count({ where: { role: "STUDENT" } }),
      db.user.count({ where: { role: "TEACHER" } }),
      db.quiz.count({ where: { status: "PUBLISHED" } }),
      db.quiz.count({ where: { status: "DRAFT" } }),
      db.attempt.count({ where: { status: { in: ["SUBMITTED", "EXPIRED"] } } }),
      db.class.findMany({
        orderBy: { name: "asc" },
        select: { name: true, _count: { select: { students: true } } },
      }),
    ]);
  return {
    students,
    teachers,
    publishedQuizzes: published,
    draftQuizzes: drafts,
    finishedAttempts: finished,
    classes: classes.map((entry) => ({
      name: entry.name,
      students: entry._count.students,
    })),
  };
}
