import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { listStudentQuizzes } from "../src/server/dashboard/queries";
import {
  createDraft,
  getTeacherQuiz,
  parseDraftSettings,
  updateDraftSettings,
  type DraftSettings,
} from "../src/server/quizzes/drafts";
import type { Database } from "../src/server/db/types";
import { seededDatabaseFixture } from "./helpers/seeded-database";

const seededAt = new Date("2031-03-01T08:00:00.000Z");
const database = seededDatabaseFixture(seededAt);
let db: Database;

// Seed identifiers (src/server/demo/seed.ts): math teaches 10A and 10B,
// science 10B and 11A, english 11A, history 10A.
const class10A = "demo-class-10a";
const class10B = "demo-class-10b";
const class11A = "demo-class-11a";
const publishedMathQuiz = "demo-quiz-math-10a-demo";
const historyDraft = "demo-quiz-history-10a-draft";

beforeAll(() => database.setup(), 60_000);
afterAll(() => database.cleanup());
beforeEach(async () => {
  db = await database.open();
});
afterEach(() => database.close(db));

function form(fields: Record<string, string | readonly string[]>) {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(fields)) {
    for (const item of [value].flat()) params.append(name, item);
  }
  return params;
}

const validFields = {
  title: "  اختبار الكسور  ",
  classId: [class10A, class10B],
  durationMinutes: "25",
  penaltyPercent: "12.5",
};

function settings(overrides: Partial<DraftSettings> = {}): DraftSettings {
  return {
    title: "اختبار الكسور",
    classIds: [class10A],
    durationMinutes: 25,
    penaltyBps: 1250,
    ...overrides,
  };
}

async function teacherId(username: string) {
  return (await db.user.findUniqueOrThrow({ where: { username } })).id;
}

describe("draft settings validation", () => {
  it("trims the title and stores the penalty as basis points", () => {
    expect(parseDraftSettings(form(validFields))).toEqual({
      ok: true,
      value: {
        title: "اختبار الكسور",
        classIds: [class10A, class10B],
        durationMinutes: 25,
        penaltyBps: 1250,
      },
    });
  });

  it("accepts the documented boundaries", () => {
    for (const [durationMinutes, penaltyPercent, bps] of [
      ["1", "0", 0],
      ["180", "100", 10_000],
      ["20", "0.01", 1],
      ["20", "33.33", 3_333],
    ] as const) {
      const result = parseDraftSettings(
        form({ ...validFields, durationMinutes, penaltyPercent }),
      );
      expect(result.ok && result.value.penaltyBps).toBe(bps);
    }
  });

  it.each([
    ["title", { title: "" }],
    ["title", { title: "   " }],
    ["title", { title: "أ".repeat(121) }],
    ["title", { title: "bad\u0007title" }],
    ["classes", { classId: [] }],
    ["classes", { classId: [class10A, class10A] }],
    ["classes", { classId: ["../etc/passwd"] }],
    ["duration", { durationMinutes: "0" }],
    ["duration", { durationMinutes: "181" }],
    ["duration", { durationMinutes: "20.5" }],
    ["duration", { durationMinutes: "-5" }],
    ["duration", { durationMinutes: "" }],
    ["penalty", { penaltyPercent: "100.01" }],
    ["penalty", { penaltyPercent: "-1" }],
    ["penalty", { penaltyPercent: "25%" }],
    ["penalty", { penaltyPercent: "12.345" }],
    ["penalty", { penaltyPercent: "1e2" }],
    ["penalty", { penaltyPercent: "" }],
  ] as const)("reports %s for %j", (field, override) => {
    expect(parseDraftSettings(form({ ...validFields, ...override }))).toEqual({
      ok: false,
      field,
    });
  });
});

describe("creating and editing drafts in the real database", () => {
  it("creates a draft for the teacher's own classes that students cannot see", async () => {
    const math = await teacherId("teacher.math");
    const result = await createDraft(
      db,
      math,
      settings({ classIds: [class10A, class10B] }),
    );
    if (!result.ok) throw new Error(result.reason);

    const quiz = await db.quiz.findUniqueOrThrow({
      where: { id: result.quizId },
      include: { classes: true },
    });
    expect(quiz).toMatchObject({
      teacherId: math,
      status: "DRAFT",
      title: "اختبار الكسور",
      durationMinutes: 25,
      penaltyBps: 1250,
      opensAt: null,
      closesAt: null,
    });
    expect(quiz.code).toMatch(/^quiz-[a-z0-9]{8}$/);
    expect(quiz.classes.map((entry) => entry.classId).sort()).toEqual([
      class10A,
      class10B,
    ]);

    const student = await db.user.findUniqueOrThrow({
      where: { username: "student.10a.01" },
    });
    const visible = await listStudentQuizzes(db, student, seededAt);
    expect(visible.map((entry) => entry.id)).not.toContain(result.quizId);
  });

  it("refuses classes the teacher does not teach and writes nothing", async () => {
    const english = await teacherId("teacher.english");
    const before = await db.quiz.count();
    expect(
      await createDraft(db, english, settings({ classIds: [class10A] })),
    ).toEqual({
      ok: false,
      reason: "classes",
    });
    expect(
      await createDraft(
        db,
        english,
        settings({ classIds: [class11A, class10A] }),
      ),
    ).toEqual({ ok: false, reason: "classes" });
    expect(await db.quiz.count()).toBe(before);
  });

  it("lets the owner change a draft's settings and classes", async () => {
    const math = await teacherId("teacher.math");
    const created = await createDraft(
      db,
      math,
      settings({ classIds: [class10A] }),
    );
    if (!created.ok) throw new Error(created.reason);

    const updated = await updateDraftSettings(db, math, created.quizId, {
      title: "Fractions review",
      classIds: [class10B],
      durationMinutes: 15,
      penaltyBps: 0,
    });
    expect(updated).toEqual({ ok: true, quizId: created.quizId });
    const quiz = await db.quiz.findUniqueOrThrow({
      where: { id: created.quizId },
      include: { classes: true },
    });
    expect(quiz).toMatchObject({
      title: "Fractions review",
      durationMinutes: 15,
      penaltyBps: 0,
      status: "DRAFT",
    });
    expect(quiz.classes.map((entry) => entry.classId)).toEqual([class10B]);
  });

  it("treats another teacher's quiz as missing and leaves it unchanged", async () => {
    const science = await teacherId("teacher.science");
    const before = await db.quiz.findUniqueOrThrow({
      where: { id: historyDraft },
    });
    expect(
      await updateDraftSettings(
        db,
        science,
        historyDraft,
        settings({ classIds: [class10B] }),
      ),
    ).toEqual({ ok: false, reason: "not_found" });
    expect(
      await db.quiz.findUniqueOrThrow({ where: { id: historyDraft } }),
    ).toEqual(before);
    expect(await getTeacherQuiz(db, science, historyDraft)).toBeNull();
  });

  it("refuses to change a published quiz", async () => {
    const math = await teacherId("teacher.math");
    const before = await db.quiz.findUniqueOrThrow({
      where: { id: publishedMathQuiz },
      include: { classes: true },
    });
    expect(
      await updateDraftSettings(
        db,
        math,
        publishedMathQuiz,
        settings({ classIds: [class10B] }),
      ),
    ).toEqual({ ok: false, reason: "locked" });
    expect(
      await db.quiz.findUniqueOrThrow({
        where: { id: publishedMathQuiz },
        include: { classes: true },
      }),
    ).toEqual(before);
  });

  it("rolls back every field when one class is not taught", async () => {
    const math = await teacherId("teacher.math");
    const created = await createDraft(
      db,
      math,
      settings({ classIds: [class10A] }),
    );
    if (!created.ok) throw new Error(created.reason);
    expect(
      await updateDraftSettings(db, math, created.quizId, {
        title: "Changed",
        classIds: [class11A],
        durationMinutes: 99,
        penaltyBps: 5_000,
      }),
    ).toEqual({ ok: false, reason: "classes" });
    const quiz = await db.quiz.findUniqueOrThrow({
      where: { id: created.quizId },
      include: { classes: true },
    });
    expect(quiz).toMatchObject({
      title: "اختبار الكسور",
      durationMinutes: 25,
      penaltyBps: 1250,
    });
    expect(quiz.classes.map((entry) => entry.classId)).toEqual([class10A]);
  });

  it("loads a quiz only for its owner", async () => {
    const math = await teacherId("teacher.math");
    const quiz = await getTeacherQuiz(db, math, publishedMathQuiz);
    expect(quiz).toMatchObject({
      status: "PUBLISHED",
      questionCount: 15,
      classes: [{ id: class10A, name: "10A" }],
    });
    expect(await getTeacherQuiz(db, math, historyDraft)).toBeNull();
    expect(await getTeacherQuiz(db, math, "../../etc")).toBeNull();
  });
});
