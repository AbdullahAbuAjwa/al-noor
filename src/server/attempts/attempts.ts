import { Prisma } from "../../generated/prisma/client";
import type { AttemptStatus } from "../../generated/prisma/enums";
import type { Database } from "../db/types";
import { quizAvailability, type Availability } from "../quizzes/availability";

export type Student = { id: string; classId: string | null };

export type StudentQuiz = {
  id: string;
  title: string;
  teacherName: string;
  opensAt: Date;
  closesAt: Date;
  durationMinutes: number;
  penaltyBps: number;
  questionCount: number;
  totalPointsHundredths: number;
  availability: Availability;
  // Whole minutes a new attempt would get if it started now (D05).
  availableMinutes: number;
  attempt: { status: AttemptStatus; deadlineAt: Date } | null;
};

// Only a published quiz assigned to the student's own class exists for them;
// drafts and other classes' quizzes are indistinguishable from missing ones.
function eligibleQuiz(student: Student, quizId: string) {
  return {
    id: quizId,
    status: "PUBLISHED" as const,
    classes: { some: { classId: student.classId ?? "" } },
  };
}

// The deadline is the earlier of the full duration and the quiz's closing
// time, fixed when the attempt starts and enforced on server time (D05).
export function attemptDeadline(
  startedAt: Date,
  durationMinutes: number,
  closesAt: Date,
): Date {
  return new Date(
    Math.min(
      startedAt.getTime() + durationMinutes * 60_000,
      closesAt.getTime(),
    ),
  );
}

export async function getStudentQuiz(
  db: Database,
  student: Student,
  quizId: string,
  now: Date,
): Promise<StudentQuiz | null> {
  if (!student.classId) return null;
  const quiz = await db.quiz.findFirst({
    where: eligibleQuiz(student, quizId),
    select: {
      id: true,
      title: true,
      opensAt: true,
      closesAt: true,
      durationMinutes: true,
      penaltyBps: true,
      teacher: { select: { name: true } },
      questions: { select: { pointsHundredths: true } },
      attempts: {
        where: { studentId: student.id },
        select: { status: true, deadlineAt: true },
      },
    },
  });
  if (!quiz?.opensAt || !quiz.closesAt) return null;
  const deadline = attemptDeadline(now, quiz.durationMinutes, quiz.closesAt);
  return {
    id: quiz.id,
    title: quiz.title,
    teacherName: quiz.teacher.name,
    opensAt: quiz.opensAt,
    closesAt: quiz.closesAt,
    durationMinutes: quiz.durationMinutes,
    penaltyBps: quiz.penaltyBps,
    questionCount: quiz.questions.length,
    totalPointsHundredths: quiz.questions.reduce(
      (sum, question) => sum + question.pointsHundredths,
      0,
    ),
    availability: quizAvailability(quiz.opensAt, quiz.closesAt, now),
    availableMinutes: Math.max(
      0,
      Math.floor((deadline.getTime() - now.getTime()) / 60_000),
    ),
    attempt: quiz.attempts[0] ?? null,
  };
}

export type StartResult =
  | { ok: true; attemptId: string; resumed: boolean }
  | { ok: false; reason: "not_found" | "upcoming" | "closed" };

// Starting is idempotent: an existing attempt (in any state) is returned, so a
// double click, a second tab, or a retried request can never create a second
// attempt or move the deadline. The unique (student, quiz) index settles
// simultaneous starts; the loser reads the winner's attempt.
export async function startAttempt(
  db: Database,
  student: Student,
  quizId: string,
  now: Date,
): Promise<StartResult> {
  if (!student.classId) return { ok: false, reason: "not_found" };
  const quiz = await db.quiz.findFirst({
    where: eligibleQuiz(student, quizId),
    select: { durationMinutes: true, opensAt: true, closesAt: true },
  });
  if (!quiz?.opensAt || !quiz.closesAt)
    return { ok: false, reason: "not_found" };

  const existing = await db.attempt.findUnique({
    where: { studentId_quizId: { studentId: student.id, quizId } },
    select: { id: true },
  });
  if (existing) return { ok: true, attemptId: existing.id, resumed: true };

  const availability = quizAvailability(quiz.opensAt, quiz.closesAt, now);
  if (availability !== "open") return { ok: false, reason: availability };

  try {
    const attempt = await db.attempt.create({
      data: {
        studentId: student.id,
        quizId,
        startedAt: now,
        deadlineAt: attemptDeadline(now, quiz.durationMinutes, quiz.closesAt),
      },
      select: { id: true },
    });
    return { ok: true, attemptId: attempt.id, resumed: false };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const winner = await db.attempt.findUniqueOrThrow({
        where: { studentId_quizId: { studentId: student.id, quizId } },
        select: { id: true },
      });
      return { ok: true, attemptId: winner.id, resumed: true };
    }
    throw error;
  }
}

export type AttemptView = {
  attemptId: string;
  status: AttemptStatus;
  startedAt: Date;
  deadlineAt: Date;
  // Server-computed; the page's countdown starts from this, not the device clock.
  remainingMs: number;
  timeOver: boolean;
  quiz: { id: string; title: string; penaltyBps: number };
  questions: {
    id: string;
    position: number;
    text: string;
    pointsHundredths: number;
    options: { id: string; position: number; text: string }[];
  }[];
};

// The student's own attempt only. The selection deliberately omits the
// correct option: answer keys never leave the server (D06).
export async function getAttemptView(
  db: Database,
  studentId: string,
  quizId: string,
  now: Date,
): Promise<AttemptView | null> {
  const attempt = await db.attempt.findUnique({
    where: { studentId_quizId: { studentId, quizId } },
    select: {
      id: true,
      status: true,
      startedAt: true,
      deadlineAt: true,
      quiz: {
        select: {
          id: true,
          title: true,
          penaltyBps: true,
          questions: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              position: true,
              text: true,
              pointsHundredths: true,
              options: {
                orderBy: { position: "asc" },
                select: { id: true, position: true, text: true },
              },
            },
          },
        },
      },
    },
  });
  if (!attempt) return null;
  const remainingMs = Math.max(0, attempt.deadlineAt.getTime() - now.getTime());
  const { questions, ...quiz } = attempt.quiz;
  return {
    attemptId: attempt.id,
    status: attempt.status,
    startedAt: attempt.startedAt,
    deadlineAt: attempt.deadlineAt,
    remainingMs,
    timeOver: remainingMs === 0,
    quiz,
    questions,
  };
}
