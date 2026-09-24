import type { createDatabaseClient } from "../db/client";
import { hashPassword } from "../auth/password";
import { demoQuizzes } from "./content";

type Database = Awaited<ReturnType<typeof createDatabaseClient>>;

export const demoSeedId = "al-noor-demo-v1";
export const demoPasswords = {
  admin: "AdminDemo2026!",
  teacher: "TeacherDemo2026!",
  student: "StudentDemo2026!",
} as const;

const classNames = ["10A", "10B", "11A"] as const;
const givenNames = [
  "آدم",
  "ليان",
  "محمد",
  "مريم",
  "عمر",
  "سارة",
  "يوسف",
  "نور",
  "خالد",
  "تالا",
  "إبراهيم",
  "جنى",
  "أحمد",
  "ريم",
  "كريم",
  "دانا",
  "حمزة",
  "هبة",
  "ياسر",
  "فرح",
];
const familyNames = ["النجار", "حماد", "سالم"] as const;
const teachers = [
  { username: "teacher.math", name: "أحمد يوسف", classes: ["10A", "10B"] },
  { username: "teacher.science", name: "سلمى حماد", classes: ["10B", "11A"] },
  { username: "teacher.english", name: "ليلى سالم", classes: ["11A"] },
  { username: "teacher.history", name: "محمود النجار", classes: ["10A"] },
] as const;

const classId = (name: string) => `demo-class-${name.toLowerCase()}`;
const userId = (username: string) => `demo-user-${username}`;
const quizId = (code: string) => `demo-quiz-${code}`;
const questionId = (code: string, position: number) =>
  `demo-question-${code}-${position}`;
const optionId = (code: string, question: number, option: number) =>
  `demo-option-${code}-${question}-${option}`;
const pointsFor = (position: number) => (position % 5 === 0 ? 200 : 100);

function dateAt(base: Date, offsetMinutes: number) {
  return new Date(base.getTime() + offsetMinutes * 60_000);
}

export async function seedDemoData(
  db: Database,
  now = new Date(),
): Promise<"created" | "existing"> {
  if (await db.seedRun.findUnique({ where: { id: demoSeedId } }))
    return "existing";

  // Hash before opening the write transaction, keeping its lock short.
  const studentUsers = classNames.flatMap((className, classIndex) =>
    givenNames.map((givenName, index) => ({
      id: userId(
        `student.${className.toLowerCase()}.${String(index + 1).padStart(2, "0")}`,
      ),
      username: `student.${className.toLowerCase()}.${String(index + 1).padStart(2, "0")}`,
      name: `${givenName} ${familyNames[classIndex]}`,
      role: "STUDENT" as const,
      classId: classId(className),
    })),
  );
  const userRows = [
    {
      id: userId("admin"),
      username: "admin",
      name: "إدارة المركز",
      role: "ADMIN" as const,
      classId: null,
    },
    ...teachers.map((teacher) => ({
      id: userId(teacher.username),
      username: teacher.username,
      name: teacher.name,
      role: "TEACHER" as const,
      classId: null,
    })),
    ...studentUsers,
  ];
  const usersWithHashes: ((typeof userRows)[number] & {
    passwordHash: string;
  })[] = [];
  for (const user of userRows) {
    const role = user.role.toLowerCase() as keyof typeof demoPasswords;
    usersWithHashes.push({
      ...user,
      passwordHash: await hashPassword(demoPasswords[role]),
    });
  }

  return db.$transaction(
    async (tx) => {
      if (await tx.seedRun.findUnique({ where: { id: demoSeedId } }))
        return "existing";
      await tx.seedRun.create({ data: { id: demoSeedId, initializedAt: now } });

      // Never mix the public demo roster with a pre-existing unmarked database.
      if (
        (await tx.class.count()) > 0 ||
        (await tx.user.count()) > 0 ||
        (await tx.quiz.count()) > 0 ||
        (await tx.attempt.count()) > 0
      ) {
        throw new Error(
          "Database has existing records without the demo marker; refusing to overwrite them.",
        );
      }

      await tx.class.createMany({
        data: classNames.map((name) => ({ id: classId(name), name })),
      });
      await tx.user.createMany({ data: usersWithHashes });
      await tx.teacherClass.createMany({
        data: teachers.flatMap((teacher) =>
          teacher.classes.map((name) => ({
            teacherId: userId(teacher.username),
            classId: classId(name),
          })),
        ),
      });

      for (const quiz of demoQuizzes) {
        const id = quizId(quiz.code);
        await tx.quiz.create({
          data: {
            id,
            code: quiz.code,
            teacherId: userId(quiz.teacherUsername),
            title: quiz.title,
            status: quiz.published ? "PUBLISHED" : "DRAFT",
            durationMinutes: 20,
            penaltyBps: quiz.penaltyBps,
            opensAt: quiz.published ? dateAt(now, -120) : null,
            closesAt: quiz.published ? dateAt(now, 14 * 24 * 60) : null,
            classes: { create: [{ classId: classId(quiz.className) }] },
            questions: {
              create: quiz.questions.map((question, index) => {
                const position = index + 1;
                return {
                  id: questionId(quiz.code, position),
                  position,
                  text: question.text,
                  pointsHundredths: pointsFor(position),
                  correctOptionPosition: question.correctPosition,
                  options: {
                    create: question.options.map((text, optionIndex) => ({
                      id: optionId(quiz.code, position, optionIndex + 1),
                      position: optionIndex + 1,
                      text,
                    })),
                  },
                };
              }),
            },
          },
        });

        if (!quiz.published) continue;
        // Students 01 in each class remain untouched for a reviewer walkthrough.
        // Student 02 has a perfect result; student 03 has 8 correct, 4 wrong, 3 blank.
        for (const [studentNumber, correctCount, incorrectCount] of [
          [2, 15, 0],
          [3, 8, 4],
        ] as const) {
          const student = `student.${quiz.className.toLowerCase()}.${String(studentNumber).padStart(2, "0")}`;
          const startedAt = dateAt(now, -60);
          const maxScoreHundredths = quiz.questions.reduce(
            (sum, _, index) => sum + pointsFor(index + 1),
            0,
          );
          const correctPoints = quiz.questions
            .slice(0, correctCount)
            .reduce((sum, _, index) => sum + pointsFor(index + 1), 0);
          const wrongPoints = quiz.questions
            .slice(correctCount, correctCount + incorrectCount)
            .reduce(
              (sum, _, index) => sum + pointsFor(correctCount + index + 1),
              0,
            );
          const scoreHundredths = Math.max(
            0,
            correctPoints - (wrongPoints * quiz.penaltyBps) / 10_000,
          );
          const attemptId = `demo-attempt-${quiz.code}-${studentNumber}`;
          await tx.attempt.create({
            data: {
              id: attemptId,
              studentId: userId(student),
              quizId: id,
              status: "SUBMITTED",
              startedAt,
              deadlineAt: dateAt(startedAt, 20),
              finalizedAt: dateAt(startedAt, 12),
              scoreHundredths,
              maxScoreHundredths,
              correctCount,
              incorrectCount,
              unansweredCount:
                quiz.questions.length - correctCount - incorrectCount,
            },
          });
          await tx.answer.createMany({
            data: quiz.questions
              .slice(0, correctCount + incorrectCount)
              .map((question, index) => {
                const position = index + 1;
                const selected =
                  index < correctCount
                    ? question.correctPosition
                    : (question.correctPosition % 4) + 1;
                return {
                  attemptId,
                  quizId: id,
                  questionId: questionId(quiz.code, position),
                  optionId: optionId(quiz.code, position, selected),
                };
              }),
          });
        }
      }
      return "created";
    },
    { maxWait: 5_000, timeout: 30_000 },
  );
}
