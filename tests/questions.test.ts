import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { createDraft } from "../src/server/quizzes/drafts";
import {
  addQuestion,
  deleteQuestion,
  listQuizQuestions,
  parseQuestion,
  updateQuestion,
  type QuestionInput,
} from "../src/server/quizzes/questions";
import type { Database } from "../src/server/db/types";
import { seededDatabaseFixture } from "./helpers/seeded-database";

const database = seededDatabaseFixture(new Date("2031-03-01T08:00:00.000Z"));
let db: Database;

// Seed (src/server/demo/content.ts): the history draft has 2 questions; the
// math quiz is published with 15.
const historyDraft = "demo-quiz-history-10a-draft";
const publishedMathQuiz = "demo-quiz-math-10a-demo";
const mathQuestion = "demo-question-math-10a-demo-1";

beforeAll(() => database.setup(), 60_000);
afterAll(() => database.cleanup());
beforeEach(async () => {
  db = await database.open();
});
afterEach(() => database.close(db));

async function teacherId(username: string) {
  return (await db.user.findUniqueOrThrow({ where: { username } })).id;
}

function form(fields: Record<string, string>) {
  return new URLSearchParams(fields);
}

const validFields = {
  text: "  ما عاصمة الأردن؟\r\nاختر إجابة واحدة.  ",
  points: "1.5",
  option1: "إربد",
  option2: "عمّان",
  option3: "الزرقاء",
  option4: "Amman Governorate",
  correctOption: "2",
};

const question: QuestionInput = {
  text: "Which planet is closest to the Sun?",
  pointsHundredths: 250,
  options: ["Venus", "Mercury", "Earth", "Mars"],
  correctPosition: 2,
};

describe("question validation", () => {
  it("normalizes line endings, trims, and stores points as hundredths", () => {
    expect(parseQuestion(form(validFields))).toEqual({
      ok: true,
      value: {
        text: "ما عاصمة الأردن؟\nاختر إجابة واحدة.",
        pointsHundredths: 150,
        options: ["إربد", "عمّان", "الزرقاء", "Amman Governorate"],
        correctPosition: 2,
      },
    });
  });

  it.each([
    ["text", { text: "   " }],
    ["text", { text: "س".repeat(501) }],
    ["text", { text: "bell\u0007" }],
    ["points", { points: "0" }],
    ["points", { points: "0.001" }],
    ["points", { points: "1000.01" }],
    ["points", { points: "-1" }],
    ["points", { points: "ten" }],
    ["options", { option3: "" }],
    ["options", { option4: "إربد" }],
    ["options", { option1: "Amman", option4: "amman" }],
    ["options", { option2: "x".repeat(201) }],
    ["options", { option2: "two\nlines" }],
    ["correct", { correctOption: "0" }],
    ["correct", { correctOption: "5" }],
    ["correct", { correctOption: "" }],
  ] as const)("reports %s for %j", (field, override) => {
    expect(parseQuestion(form({ ...validFields, ...override }))).toEqual({
      ok: false,
      field,
    });
  });
});

describe("editing questions in the real database", () => {
  it("appends a question with its four options to the owner's draft", async () => {
    const history = await teacherId("teacher.history");
    expect(await addQuestion(db, history, historyDraft, question)).toEqual({
      ok: true,
    });
    const questions = await listQuizQuestions(db, historyDraft);
    expect(questions.map((entry) => entry.position)).toEqual([1, 2, 3]);
    expect(questions[2]).toMatchObject({
      text: question.text,
      pointsHundredths: 250,
      correctOptionPosition: 2,
      options: [
        { position: 1, text: "Venus" },
        { position: 2, text: "Mercury" },
        { position: 3, text: "Earth" },
        { position: 4, text: "Mars" },
      ],
    });
  });

  it("refuses other teachers and published quizzes without writing", async () => {
    const science = await teacherId("teacher.science");
    const math = await teacherId("teacher.math");
    const before = await db.question.count();
    expect(await addQuestion(db, science, historyDraft, question)).toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(await addQuestion(db, math, publishedMathQuiz, question)).toEqual({
      ok: false,
      reason: "locked",
    });
    expect(
      await updateQuestion(db, math, publishedMathQuiz, mathQuestion, question),
    ).toEqual({
      ok: false,
      reason: "locked",
    });
    expect(
      await deleteQuestion(db, math, publishedMathQuiz, mathQuestion),
    ).toEqual({
      ok: false,
      reason: "locked",
    });
    expect(await db.question.count()).toBe(before);
  });

  it("updates a question's text, points, options, and correct answer", async () => {
    const history = await teacherId("teacher.history");
    const [, second] = await listQuizQuestions(db, historyDraft);
    expect(
      await updateQuestion(db, history, historyDraft, second.id, {
        text: "سؤال معدّل",
        pointsHundredths: 125,
        options: ["أ", "ب", "ج", "د"],
        correctPosition: 4,
      }),
    ).toEqual({ ok: true });
    const updated = (await listQuizQuestions(db, historyDraft))[1];
    expect(updated).toMatchObject({
      id: second.id,
      position: 2,
      text: "سؤال معدّل",
      pointsHundredths: 125,
      correctOptionPosition: 4,
    });
    expect(updated.options.map((option) => option.text)).toEqual([
      "أ",
      "ب",
      "ج",
      "د",
    ]);
  });

  it("will not edit a question through another quiz's address", async () => {
    const history = await teacherId("teacher.history");
    const before = await db.question.findUniqueOrThrow({
      where: { id: mathQuestion },
      include: { options: true },
    });
    expect(
      await updateQuestion(db, history, historyDraft, mathQuestion, question),
    ).toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(
      await deleteQuestion(db, history, historyDraft, mathQuestion),
    ).toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(
      await db.question.findUniqueOrThrow({
        where: { id: mathQuestion },
        include: { options: true },
      }),
    ).toEqual(before);
  });

  it("renumbers the remaining questions after a deletion", async () => {
    const history = await teacherId("teacher.history");
    await addQuestion(db, history, historyDraft, question);
    const [first, second, third] = await listQuizQuestions(db, historyDraft);
    expect(await deleteQuestion(db, history, historyDraft, first.id)).toEqual({
      ok: true,
    });
    const remaining = await listQuizQuestions(db, historyDraft);
    expect(remaining.map((entry) => [entry.id, entry.position])).toEqual([
      [second.id, 1],
      [third.id, 2],
    ]);
    expect(await db.option.count({ where: { questionId: first.id } })).toBe(0);
  });

  it("stops at 200 questions", async () => {
    const math = await teacherId("teacher.math");
    const draft = await createDraft(db, math, {
      title: "Long quiz",
      classIds: ["demo-class-10a"],
      durationMinutes: 60,
      penaltyBps: 0,
    });
    if (!draft.ok) throw new Error(draft.reason);
    await db.question.createMany({
      data: Array.from({ length: 200 }, (_, index) => ({
        quizId: draft.quizId,
        position: index + 1,
        text: `Q${index + 1}`,
        pointsHundredths: 100,
        correctOptionPosition: 1,
      })),
    });
    expect(await addQuestion(db, math, draft.quizId, question)).toEqual({
      ok: false,
      reason: "limit",
    });
  });
});
