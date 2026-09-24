import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import writeExcelFile from "write-excel-file/node";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { createDatabaseClient } from "../src/server/db/client";
import { verifyPassword } from "../src/server/auth/password";
import {
  importHeaders,
  templateExamples,
} from "../src/server/imports/contract";
import { importFromFile } from "../src/server/imports/persist";
import { readImportFile } from "../src/server/imports/read";

const root = mkdtempSync(join(tmpdir(), "al-noor-import-tests-"));
const template = join(root, "seeded.db");
let directory: string;
let url: string;
let db: Awaited<ReturnType<typeof createDatabaseClient>>;

function script(path: string, databaseUrl: string, args: string[] = []) {
  return execFileSync(process.execPath, ["--import", "tsx", path, ...args], {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    encoding: "utf8",
  });
}

function csv(name: string, lines: string[]) {
  const path = join(directory, name);
  writeFileSync(path, `${lines.join("\n")}\n`, "utf8");
  return path;
}

beforeAll(() => {
  script("scripts/migrate.ts", `file:${template}`);
  script("scripts/seed.ts", `file:${template}`);
}, 30_000);
afterAll(() => rmSync(root, { recursive: true, force: true }));
beforeEach(async () => {
  directory = mkdtempSync(join(root, "case-"));
  const file = join(directory, "test.db");
  copyFileSync(template, file);
  url = `file:${file}`;
  db = await createDatabaseClient(url);
});
afterEach(async () => {
  await db?.$disconnect();
  if (directory) rmSync(directory, { recursive: true, force: true });
});

describe("CSV/XLSX imports against real SQLite", () => {
  for (const extension of ["csv", "xlsx"] as const) {
    it(`loads equivalent teacher, student, and draft quiz templates from ${extension}`, async () => {
      for (const kind of ["teachers", "students", "quiz"] as const) {
        const result = await importFromFile(
          db,
          kind,
          resolve(`templates/${kind}.${extension}`),
        );
        expect(result.imported).toBe(kind === "quiz" ? 3 : 1);
      }
      expect(await db.user.count()).toBe(67);
      expect(await db.quiz.count()).toBe(5);
      const teacher = await db.user.findUniqueOrThrow({
        where: { username: "teacher.geography" },
        include: { teaching: true },
      });
      expect(teacher.role).toBe("TEACHER");
      expect(teacher.teaching).toHaveLength(2);
      expect(
        await verifyPassword("TeacherExample2026!", teacher.passwordHash),
      ).toBe(true);
      const student = await db.user.findUniqueOrThrow({
        where: { username: "student.10a.21" },
        include: { class: true },
      });
      expect(student.class?.name).toBe("10A");
      expect(
        await verifyPassword("StudentExample2026!", student.passwordHash),
      ).toBe(true);
      const quiz = await db.quiz.findUniqueOrThrow({
        where: { code: "geography-10a-import" },
        include: {
          classes: true,
          questions: {
            include: { options: true },
            orderBy: { position: "asc" },
          },
        },
      });
      expect(quiz.status).toBe("DRAFT");
      expect(quiz.opensAt).toBeNull();
      expect(quiz.durationMinutes).toBe(20);
      expect(quiz.penaltyBps).toBe(2500);
      expect(quiz.classes).toHaveLength(1);
      expect(quiz.questions.map((question) => question.position)).toEqual([
        1, 2, 3,
      ]);
      expect(quiz.questions[0].pointsHundredths).toBe(150);
      expect(quiz.questions[0].options).toHaveLength(4);
      expect(quiz.questions[2].correctOptionPosition).toBe(4);
    }, 30_000);
  }

  it("rejects a later existing username and rolls back earlier rows", async () => {
    const path = csv("two-teachers.csv", [
      importHeaders.teachers.join(","),
      "teacher.newone,هالة سمير,TeacherExample2026!,10A",
      "teacher.math,Existing name,TeacherExample2026!,10A",
    ]);
    await expect(importFromFile(db, "teachers", path)).rejects.toThrow(
      "Row 3, column username: Username already exists.",
    );
    expect(
      await db.user.findUnique({ where: { username: "teacher.newone" } }),
    ).toBeNull();
    expect(await db.user.count()).toBe(65);
  }, 30_000);

  it("rejects duplicate usernames, missing classes, and unauthorized teacher classes", async () => {
    const duplicate = csv("duplicate.csv", [
      importHeaders.students.join(","),
      "student.newone,نور,StudentExample2026!,10A",
      "student.newone,نور,StudentExample2026!,10A",
    ]);
    await expect(importFromFile(db, "students", duplicate)).rejects.toThrow(
      "Row 3, column username",
    );
    const unknownClass = csv("unknown-class.csv", [
      importHeaders.students.join(","),
      "student.newone,نور,StudentExample2026!,12Z",
    ]);
    await expect(importFromFile(db, "students", unknownClass)).rejects.toThrow(
      "Row 2, column class",
    );

    const teacher = csv("teacher-10b.csv", [
      importHeaders.teachers.join(","),
      "teacher.geography,هالة سمير,TeacherExample2026!,10B",
    ]);
    await importFromFile(db, "teachers", teacher);
    await expect(
      importFromFile(db, "quiz", resolve("templates/quiz.csv")),
    ).rejects.toThrow(
      "Row 2, column classes: Teacher is not assigned to class 10A.",
    );
    expect(
      await db.quiz.findUnique({ where: { code: "geography-10a-import" } }),
    ).toBeNull();
    expect(await db.user.count()).toBe(66);
  }, 30_000);

  it("rejects inconsistent quiz metadata and nonconsecutive positions before writing", async () => {
    await importFromFile(db, "teachers", resolve("templates/teachers.csv"));
    const source = readFileSync(resolve("templates/quiz.csv"), "utf8");
    const changed = csv(
      "bad-title.csv",
      source
        .trimEnd()
        .split("\n")
        .map((line, index) =>
          index === 2
            ? line.replace("جغرافيا الصف العاشر: مسودة", "عنوان آخر")
            : line,
        ),
    );
    await expect(importFromFile(db, "quiz", changed)).rejects.toThrow(
      "Row 3, column quiz_title",
    );
    const gap = csv(
      "gap.csv",
      source
        .trimEnd()
        .split("\n")
        .map((line, index) =>
          index === 2 ? line.replace(",2,ما أكبر", ",5,ما أكبر") : line,
        ),
    );
    await expect(importFromFile(db, "quiz", gap)).rejects.toThrow(
      "column question_position",
    );
    expect(await db.quiz.count()).toBe(4);
  }, 30_000);

  it("treats a quoted multiline CSV field as one record and reports its physical line", async () => {
    const path = csv("quoted.csv", [
      importHeaders.students.join(","),
      'student.test.01,"فادي\nسمير",StudentExample2026!,10A',
      "student.test.02,ليان,short,10A",
    ]);
    await expect(importFromFile(db, "students", path)).rejects.toThrow(
      "Row 4, column password",
    );
    expect(
      await db.user.findUnique({ where: { username: "student.test.01" } }),
    ).toBeNull();
  }, 30_000);

  it("rejects malformed CSV and unsupported XLSX formulas or workbook layout", async () => {
    const invalidCsv = csv("invalid.csv", [
      importHeaders.students.join(","),
      '"unclosed',
    ]);
    await expect(readImportFile(invalidCsv, "students")).rejects.toThrow(
      "Malformed CSV",
    );
    const formula = join(directory, "formula.xlsx");
    const cells = [
      [...importHeaders.students],
      [
        "student.formula",
        "نور",
        { type: "Formula" as const, value: '=CONCAT("a","b")' },
        "10A",
      ],
    ];
    await writeExcelFile(cells, { sheet: "Import" }).toFile(formula);
    await expect(readImportFile(formula, "students")).rejects.toThrow(
      "Formula cells are not supported",
    );
    const wrongSheet = join(directory, "wrong-sheet.xlsx");
    await writeExcelFile(
      [[...importHeaders.students], [...templateExamples.students[0]]],
      { sheet: "Other" },
    ).toFile(wrongSheet);
    await expect(readImportFile(wrongSheet, "students")).rejects.toThrow(
      'named "Import"',
    );
  }, 30_000);

  it("rejects a small compressed workbook with excessive expanded content", async () => {
    const path = join(directory, "oversized.xlsx");
    writeFileSync(
      path,
      zipSync({ "xl/worksheets/sheet1.xml": new Uint8Array(17 * 1024 * 1024) }),
    );
    await expect(readImportFile(path, "quiz")).rejects.toThrow(
      "archive exceeds",
    );
  }, 30_000);

  it("preserves password whitespace for validation and rejects macros and merged cells", async () => {
    const spaced = join(directory, "spaced.xlsx");
    await writeExcelFile(
      [
        [...importHeaders.students],
        ["student.space", "نور", " StudentExample2026!", "10A"],
      ],
      { sheet: "Import" },
    ).toFile(spaced);
    await expect(importFromFile(db, "students", spaced)).rejects.toThrow(
      "Row 2, column password",
    );

    const parts = unzipSync(readFileSync(resolve("templates/students.xlsx")));
    const macro = join(directory, "macro.xlsx");
    writeFileSync(
      macro,
      zipSync({ ...parts, "xl/vbaProject.bin": strToU8("macro") }),
    );
    await expect(readImportFile(macro, "students")).rejects.toThrow(
      "Macro-enabled",
    );

    const worksheet = Object.keys(parts).find(
      (name) => name.startsWith("xl/worksheets/") && name.endsWith(".xml"),
    );
    expect(worksheet).toBeDefined();
    const merged = join(directory, "merged.xlsx");
    writeFileSync(
      merged,
      zipSync({
        ...parts,
        [worksheet!]: strToU8(
          strFromU8(parts[worksheet!]).replace(
            "</worksheet>",
            '<mergeCells count="1"><mergeCell ref="A1:B1"/></mergeCells></worksheet>',
          ),
        ),
      }),
    );
    await expect(readImportFile(merged, "students")).rejects.toThrow(
      "Merged cells",
    );
    expect(await db.user.count()).toBe(65);
  }, 30_000);

  it("the documented CLI imports a template and rejects re-import without changes", async () => {
    await db.$disconnect();
    expect(
      script("scripts/import.ts", url, ["teachers", "templates/teachers.csv"]),
    ).toContain("Imported 1 teachers");
    db = await createDatabaseClient(url);
    expect(await db.user.count()).toBe(66);
    await db.$disconnect();
    expect(() =>
      script("scripts/import.ts", url, ["teachers", "templates/teachers.csv"]),
    ).toThrow();
    db = await createDatabaseClient(url);
    expect(await db.user.count()).toBe(66);
  }, 30_000);
});
