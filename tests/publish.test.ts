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
import { createDraft, updateDraftSettings } from "../src/server/quizzes/drafts";
import {
  parsePublication,
  publishQuiz,
  suggestedWindow,
} from "../src/server/quizzes/publish";
import { addQuestion } from "../src/server/quizzes/questions";
import { toZonedInput, zonedInputToDate } from "../src/server/time/zone";
import type { Database } from "../src/server/db/types";
import { seededDatabaseFixture } from "./helpers/seeded-database";

const seededAt = new Date("2031-03-01T08:00:00.000Z");
const database = seededDatabaseFixture(seededAt);
let db: Database;

// Seed: the history draft (teacher.history, class 10A, 20 minutes) has two
// complete questions; the math quiz is already published.
const historyDraft = "demo-quiz-history-10a-draft";
const publishedMathQuiz = "demo-quiz-math-10a-demo";
const window = {
  opensAt: new Date("2031-03-01T09:00:00.000Z"),
  closesAt: new Date("2031-03-08T09:00:00.000Z"),
};

beforeAll(() => database.setup(), 60_000);
afterAll(() => database.cleanup());
beforeEach(async () => {
  db = await database.open();
});
afterEach(() => database.close(db));

async function teacherId(username: string) {
  return (await db.user.findUniqueOrThrow({ where: { username } })).id;
}

async function status(quizId: string) {
  return db.quiz.findUniqueOrThrow({
    where: { id: quizId },
    select: { status: true, opensAt: true, closesAt: true },
  });
}

describe("Amman wall-clock times", () => {
  it("converts to UTC with the offset in force on that date", () => {
    // Jordan has used UTC+3 all year since late 2022; winter 2021 was UTC+2.
    expect(zonedInputToDate("2031-03-01T10:00")).toEqual(
      new Date("2031-03-01T07:00:00.000Z"),
    );
    expect(zonedInputToDate("2021-01-15T10:00")).toEqual(
      new Date("2021-01-15T08:00:00.000Z"),
    );
    expect(toZonedInput(new Date("2031-03-01T07:00:00.000Z"))).toBe(
      "2031-03-01T10:00",
    );
  });

  it.each([
    "",
    "2031-03-01 10:00",
    "2031-3-1T10:00",
    "2031-02-30T10:00",
    "2031-03-01T24:00",
    "1999-12-31T10:00",
    "2031-03-01T10:00Z",
  ])("rejects %j", (value) => {
    expect(zonedInputToDate(value)).toBeNull();
  });
});

describe("publication form", () => {
  const now = seededAt;
  const valid = {
    confirm: "yes",
    opensAt: "2031-03-01T12:00",
    closesAt: "2031-03-08T12:00",
  };

  it("suggests a week-long window from the next five-minute mark", () => {
    expect(suggestedWindow(new Date("2031-03-01T08:01:30.000Z"))).toEqual({
      opensAt: new Date("2031-03-01T08:05:00.000Z"),
      closesAt: new Date("2031-03-08T08:05:00.000Z"),
    });
  });

  it("reads the window in Amman time", () => {
    expect(parsePublication(new URLSearchParams(valid), now)).toEqual({
      ok: true,
      opensAt: new Date("2031-03-01T09:00:00.000Z"),
      closesAt: new Date("2031-03-08T09:00:00.000Z"),
    });
  });

  it.each([
    ["confirm", { confirm: "" }],
    ["windowFormat", { opensAt: "tomorrow" }],
    ["windowOrder", { closesAt: "2031-03-01T12:00" }],
    ["windowOrder", { closesAt: "2031-03-01T11:59" }],
    // 10:00 Amman is 07:00 UTC, before the server's 08:00 UTC "now".
    [
      "windowPast",
      { opensAt: "2031-02-01T10:00", closesAt: "2031-03-01T10:00" },
    ],
  ] as const)("reports %s for %j", (field, override) => {
    expect(
      parsePublication(new URLSearchParams({ ...valid, ...override }), now),
    ).toEqual({
      ok: false,
      field,
    });
  });
});

describe("publishing against the real database", () => {
  it("publishes a complete draft, shows it to its class, and fixes it", async () => {
    const history = await teacherId("teacher.history");
    expect(await publishQuiz(db, history, historyDraft, window)).toEqual({
      ok: true,
    });
    expect(await status(historyDraft)).toEqual({
      status: "PUBLISHED",
      ...window,
    });

    const student = await db.user.findUniqueOrThrow({
      where: { username: "student.10a.01" },
    });
    const before = await listStudentQuizzes(
      db,
      student,
      new Date("2031-03-01T08:30:00.000Z"),
    );
    const during = await listStudentQuizzes(
      db,
      student,
      new Date("2031-03-01T10:00:00.000Z"),
    );
    expect(before.find((quiz) => quiz.id === historyDraft)?.availability).toBe(
      "upcoming",
    );
    expect(during.find((quiz) => quiz.id === historyDraft)?.availability).toBe(
      "open",
    );

    // Nothing about a published quiz can change afterwards (D04).
    expect(
      await updateDraftSettings(db, history, historyDraft, {
        title: "Changed",
        classIds: ["demo-class-10a"],
        durationMinutes: 5,
        penaltyBps: 0,
      }),
    ).toEqual({ ok: false, reason: "locked" });
    expect(
      await addQuestion(db, history, historyDraft, {
        text: "Late question",
        pointsHundredths: 100,
        options: ["a", "b", "c", "d"],
        correctPosition: 1,
      }),
    ).toEqual({ ok: false, reason: "locked" });
    expect(await publishQuiz(db, history, historyDraft, window)).toEqual({
      ok: false,
      reason: "locked",
    });
  });

  it("hides another teacher's draft and leaves it unpublished", async () => {
    const math = await teacherId("teacher.math");
    expect(await publishQuiz(db, math, historyDraft, window)).toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(await status(historyDraft)).toEqual({
      status: "DRAFT",
      opensAt: null,
      closesAt: null,
    });
    expect(await publishQuiz(db, math, publishedMathQuiz, window)).toEqual({
      ok: false,
      reason: "locked",
    });
  });

  it("refuses an empty draft or an incomplete question", async () => {
    const math = await teacherId("teacher.math");
    const draft = await createDraft(db, math, {
      title: "Empty",
      classIds: ["demo-class-10a"],
      durationMinutes: 20,
      penaltyBps: 0,
    });
    if (!draft.ok) throw new Error(draft.reason);
    expect(await publishQuiz(db, math, draft.quizId, window)).toEqual({
      ok: false,
      reason: "noQuestions",
    });

    // A question with three options (possible only by writing the table
    // directly) must still block publication.
    await db.question.create({
      data: {
        quizId: draft.quizId,
        position: 1,
        text: "Three options only",
        pointsHundredths: 100,
        correctOptionPosition: 1,
        options: {
          create: [1, 2, 3].map((position) => ({
            position,
            text: `o${position}`,
          })),
        },
      },
    });
    expect(await publishQuiz(db, math, draft.quizId, window)).toEqual({
      ok: false,
      reason: "incompleteQuestions",
    });
    expect((await status(draft.quizId)).status).toBe("DRAFT");
  });

  it("refuses a class the teacher no longer teaches", async () => {
    const history = await teacherId("teacher.history");
    await db.teacherClass.delete({
      where: {
        teacherId_classId: { teacherId: history, classId: "demo-class-10a" },
      },
    });
    expect(await publishQuiz(db, history, historyDraft, window)).toEqual({
      ok: false,
      reason: "publishClasses",
    });
  });

  it("refuses a window shorter than the quiz duration", async () => {
    const history = await teacherId("teacher.history");
    const short = {
      opensAt: new Date("2031-03-01T09:00:00.000Z"),
      closesAt: new Date("2031-03-01T09:19:00.000Z"),
    };
    expect(await publishQuiz(db, history, historyDraft, short)).toEqual({
      ok: false,
      reason: "windowShort",
    });
    const exact = { ...short, closesAt: new Date("2031-03-01T09:20:00.000Z") };
    expect(await publishQuiz(db, history, historyDraft, exact)).toEqual({
      ok: true,
    });
  });
});
