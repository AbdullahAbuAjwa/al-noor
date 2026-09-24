import { Prisma } from "../../generated/prisma/client";
import { hashPassword } from "../auth/password";
import type { createDatabaseClient } from "../db/client";
import type { ImportKind } from "./contract";
import { ImportError } from "./error";
import { readImportFile } from "./read";
import {
  validateQuiz,
  validateStudents,
  validateTeachers,
  type QuizImport,
  type StudentImport,
  type TeacherImport,
} from "./validate";

type Database = Awaited<ReturnType<typeof createDatabaseClient>>;
type Account = TeacherImport | StudentImport;

function conflict(error: unknown, row: number, column: string): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new ImportError("Value already exists in the database.", row, column);
  }
  throw error;
}

async function hashesFor(rows: Account[]) {
  const result: string[] = [];
  // Derive outside the write transaction so hashing cannot hold the SQLite lock.
  for (const row of rows) result.push(await hashPassword(row.password));
  return result;
}

async function importTeachers(db: Database, rows: TeacherImport[]) {
  const hashes = await hashesFor(rows);
  await db.$transaction(
    async (tx) => {
      for (const [index, row] of rows.entries()) {
        if (await tx.user.findUnique({ where: { username: row.username } })) {
          throw new ImportError(
            "Username already exists.",
            row.row,
            "username",
          );
        }
        const classIds: string[] = [];
        for (const name of row.classes) {
          const found = await tx.class.findUnique({ where: { name } });
          if (!found)
            throw new ImportError(
              `Class ${name} does not exist.`,
              row.row,
              "classes",
            );
          classIds.push(found.id);
        }
        try {
          const teacher = await tx.user.create({
            data: {
              username: row.username,
              name: row.name,
              passwordHash: hashes[index],
              role: "TEACHER",
            },
          });
          await tx.teacherClass.createMany({
            data: classIds.map((classId) => ({
              teacherId: teacher.id,
              classId,
            })),
          });
        } catch (error) {
          conflict(error, row.row, "username");
        }
      }
    },
    { maxWait: 5_000, timeout: 60_000 },
  );
  return { kind: "teachers" as const, imported: rows.length };
}

async function importStudents(db: Database, rows: StudentImport[]) {
  const hashes = await hashesFor(rows);
  await db.$transaction(
    async (tx) => {
      for (const [index, row] of rows.entries()) {
        if (await tx.user.findUnique({ where: { username: row.username } })) {
          throw new ImportError(
            "Username already exists.",
            row.row,
            "username",
          );
        }
        const found = await tx.class.findUnique({
          where: { name: row.className },
        });
        if (!found)
          throw new ImportError(
            `Class ${row.className} does not exist.`,
            row.row,
            "class",
          );
        try {
          await tx.user.create({
            data: {
              username: row.username,
              name: row.name,
              passwordHash: hashes[index],
              role: "STUDENT",
              classId: found.id,
            },
          });
        } catch (error) {
          conflict(error, row.row, "username");
        }
      }
    },
    { maxWait: 5_000, timeout: 60_000 },
  );
  return { kind: "students" as const, imported: rows.length };
}

async function importQuiz(db: Database, input: QuizImport) {
  await db.$transaction(
    async (tx) => {
      if (await tx.quiz.findUnique({ where: { code: input.code } })) {
        throw new ImportError(
          "Quiz code already exists.",
          input.row,
          "quiz_code",
        );
      }
      const teacher = await tx.user.findUnique({
        where: { username: input.teacherUsername },
      });
      if (!teacher || teacher.role !== "TEACHER") {
        throw new ImportError(
          "Teacher account does not exist.",
          input.row,
          "teacher_username",
        );
      }
      const classIds: string[] = [];
      for (const name of input.classes) {
        const found = await tx.class.findUnique({ where: { name } });
        if (!found)
          throw new ImportError(
            `Class ${name} does not exist.`,
            input.row,
            "classes",
          );
        if (
          !(await tx.teacherClass.findUnique({
            where: {
              teacherId_classId: { teacherId: teacher.id, classId: found.id },
            },
          }))
        ) {
          throw new ImportError(
            `Teacher is not assigned to class ${name}.`,
            input.row,
            "classes",
          );
        }
        classIds.push(found.id);
      }
      try {
        await tx.quiz.create({
          data: {
            code: input.code,
            title: input.title,
            teacherId: teacher.id,
            status: "DRAFT",
            durationMinutes: input.durationMinutes,
            penaltyBps: input.penaltyBps,
            opensAt: null,
            closesAt: null,
            classes: { create: classIds.map((classId) => ({ classId })) },
            questions: {
              create: input.questions.map((question) => ({
                position: question.position,
                text: question.text,
                pointsHundredths: question.pointsHundredths,
                correctOptionPosition: question.correctPosition,
                options: {
                  create: question.options.map((text, index) => ({
                    position: index + 1,
                    text,
                  })),
                },
              })),
            },
          },
        });
      } catch (error) {
        conflict(error, input.row, "quiz_code");
      }
    },
    { maxWait: 5_000, timeout: 60_000 },
  );
  return {
    kind: "quiz" as const,
    imported: input.questions.length,
    code: input.code,
  };
}

export async function importFromFile(
  db: Database,
  kind: ImportKind,
  path: string,
) {
  const table = await readImportFile(path, kind);
  if (kind === "teachers") return importTeachers(db, validateTeachers(table));
  if (kind === "students") return importStudents(db, validateStudents(table));
  return importQuiz(db, validateQuiz(table));
}
