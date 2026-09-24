import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import {
  homePathFor,
  loginPagePath,
  postLoginPath,
  safeLocalPath,
} from "../src/server/auth/paths";
import {
  getCenterOverview,
  listStudentQuizzes,
  listTeacherQuizzes,
} from "../src/server/dashboard/queries";
import { quizAvailability } from "../src/server/quizzes/availability";
import type { Database } from "../src/server/db/types";
import { seededDatabaseFixture } from "./helpers/seeded-database";

// The demo seed opens published quizzes 2 hours before and closes them 14 days
// after the seed time (D20).
const seededAt = new Date("2031-03-01T08:00:00.000Z");
const opensAt = new Date("2031-03-01T06:00:00.000Z");
const closesAt = new Date("2031-03-15T08:00:00.000Z");
const database = seededDatabaseFixture(seededAt);
let db: Database;

beforeAll(() => database.setup(), 60_000);
afterAll(() => database.cleanup());
beforeEach(async () => {
  db = await database.open();
});
afterEach(() => database.close(db));

async function student(username: string) {
  return db.user.findUniqueOrThrow({
    where: { username },
    select: { id: true, classId: true },
  });
}

describe("role routing and safe redirects", () => {
  it("maps each role to its own area", () => {
    expect(homePathFor("STUDENT")).toBe("/student");
    expect(homePathFor("TEACHER")).toBe("/teacher");
    expect(homePathFor("ADMIN")).toBe("/admin");
  });

  it("accepts only local absolute paths", () => {
    expect(safeLocalPath("/student")).toBe("/student");
    expect(safeLocalPath("/login?next=%2Fadmin")).toBe("/login?next=%2Fadmin");
    for (const unsafe of [
      "//evil.example/student",
      "/\\evil.example",
      "https://evil.example",
      "student",
      "/student\u0000",
      "/student\nSet-Cookie: x=y",
      `/${"a".repeat(512)}`,
      null,
      42,
    ]) {
      expect(safeLocalPath(unsafe)).toBeNull();
    }
  });

  it("keeps only recognized sign-in state in the page's own return path", () => {
    expect(loginPagePath({})).toBe("/login");
    expect(loginPagePath({ error: "invalid", next: "/student" })).toBe(
      "/login?error=invalid&next=%2Fstudent",
    );
    expect(loginPagePath({ error: "throttled" })).toBe(
      "/login?error=throttled",
    );
    expect(loginPagePath({ signedOut: "1" })).toBe("/login?signedOut=1");
    // Unknown messages, unsafe return paths, and repeated values are dropped.
    expect(
      loginPagePath({
        error: "<script>",
        next: "//evil.example",
        signedOut: ["1"],
      }),
    ).toBe("/login");
    expect(loginPagePath({ error: ["invalid"], next: ["/student"] })).toBe(
      "/login",
    );
  });

  it("returns to a requested page only inside the signed-in role's area", () => {
    expect(postLoginPath("STUDENT", "/student")).toBe("/student");
    expect(postLoginPath("STUDENT", "/student/quizzes/abc")).toBe(
      "/student/quizzes/abc",
    );
    expect(postLoginPath("STUDENT", "/teacher")).toBe("/student");
    expect(postLoginPath("STUDENT", "/admin")).toBe("/student");
    expect(postLoginPath("STUDENT", "/studentx")).toBe("/student");
    expect(postLoginPath("TEACHER", "//evil.example/teacher")).toBe("/teacher");
    expect(postLoginPath("ADMIN", undefined)).toBe("/admin");
  });
});

describe("availability boundaries", () => {
  it("opens inclusively and closes exclusively on server time", () => {
    expect(
      quizAvailability(opensAt, closesAt, new Date(opensAt.getTime() - 1)),
    ).toBe("upcoming");
    expect(quizAvailability(opensAt, closesAt, opensAt)).toBe("open");
    expect(
      quizAvailability(opensAt, closesAt, new Date(closesAt.getTime() - 1)),
    ).toBe("open");
    expect(quizAvailability(opensAt, closesAt, closesAt)).toBe("closed");
  });
});

describe("role-scoped data on each home page", () => {
  it("shows a student only published quizzes assigned to their own class", async () => {
    const tenA = await listStudentQuizzes(
      db,
      await student("student.10a.01"),
      seededAt,
    );
    // 10A also has a history draft, which must stay hidden from students.
    expect(tenA.map((quiz) => quiz.title)).toEqual([
      "رياضيات الصف العاشر: حساب وجبر",
    ]);
    expect(tenA[0]).toMatchObject({
      teacherName: "أحمد يوسف",
      questionCount: 15,
      durationMinutes: 20,
      penaltyBps: 2500,
      availability: "open",
      attemptStatus: null,
      opensAt,
      closesAt,
    });

    const tenB = await listStudentQuizzes(
      db,
      await student("student.10b.01"),
      seededAt,
    );
    expect(tenB).toHaveLength(1);
    expect(tenB[0].title).not.toBe(tenA[0].title);

    const finished = await listStudentQuizzes(
      db,
      await student("student.10a.02"),
      seededAt,
    );
    expect(finished[0].attemptStatus).toBe("SUBMITTED");
    expect(
      await listStudentQuizzes(db, { id: "none", classId: null }, seededAt),
    ).toEqual([]);
  });

  it("reports availability from the server clock", async () => {
    const account = await student("student.11a.01");
    const before = await listStudentQuizzes(
      db,
      account,
      new Date(opensAt.getTime() - 1),
    );
    const after = await listStudentQuizzes(db, account, closesAt);
    expect(before[0].availability).toBe("upcoming");
    expect(after[0].availability).toBe("closed");
  });

  it("shows a teacher only their own quizzes, including drafts", async () => {
    const math = await db.user.findUniqueOrThrow({
      where: { username: "teacher.math" },
    });
    const history = await db.user.findUniqueOrThrow({
      where: { username: "teacher.history" },
    });

    const mathQuizzes = await listTeacherQuizzes(db, math.id);
    expect(mathQuizzes).toHaveLength(1);
    expect(mathQuizzes[0]).toMatchObject({
      code: "math-10a-demo",
      status: "PUBLISHED",
      classNames: ["10A"],
      questionCount: 15,
      finishedAttempts: 2,
    });

    const historyQuizzes = await listTeacherQuizzes(db, history.id);
    expect(historyQuizzes).toHaveLength(1);
    expect(historyQuizzes[0]).toMatchObject({
      code: "history-10a-draft",
      status: "DRAFT",
      opensAt: null,
      closesAt: null,
      finishedAttempts: 0,
    });
  });

  it("gives the administrator centre-wide totals", async () => {
    expect(await getCenterOverview(db)).toEqual({
      students: 60,
      teachers: 4,
      publishedQuizzes: 3,
      draftQuizzes: 1,
      finishedAttempts: 6,
      classes: [
        { name: "10A", students: 20 },
        { name: "10B", students: 20 },
        { name: "11A", students: 20 },
      ],
    });
  });
});
