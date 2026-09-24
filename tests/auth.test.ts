import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { login } from "../src/server/auth/login";
import {
  deleteSession,
  findSessionUser,
  hashSessionToken,
  sessionLifetimeMs,
} from "../src/server/auth/session";
import { LoginThrottle } from "../src/server/auth/throttle";
import { demoPasswords } from "../src/server/demo/seed";
import type { Database } from "../src/server/db/types";
import { seededDatabaseFixture } from "./helpers/seeded-database";

const seededAt = new Date("2031-03-01T08:00:00.000Z");
const now = new Date("2031-03-01T09:00:00.000Z");
const database = seededDatabaseFixture(seededAt);
let db: Database;

function later(ms: number) {
  return new Date(now.getTime() + ms);
}

async function signIn(
  username: string,
  password: string,
  at = now,
  throttle = new LoginThrottle(),
) {
  return login(db, { username, password }, { now: at, throttle });
}

beforeAll(() => database.setup(), 60_000);
afterAll(() => database.cleanup());
beforeEach(async () => {
  db = await database.open();
});
afterEach(() => database.close(db));

describe("password login and server sessions", () => {
  it("signs in each demo role and stores only a hash of the session token", async () => {
    const cases = [
      ["admin", demoPasswords.admin, "ADMIN", null],
      ["teacher.math", demoPasswords.teacher, "TEACHER", null],
      ["student.10a.01", demoPasswords.student, "STUDENT", "10A"],
    ] as const;
    for (const [username, password, role, className] of cases) {
      const result = await signIn(username, password);
      expect(result.status).toBe("success");
      if (result.status !== "success") continue;
      expect(result.user.role).toBe(role);
      expect(result.session.expiresAt).toEqual(later(sessionLifetimeMs));

      const stored = await db.session.findMany({ where: { userId: result.user.id } });
      expect(stored).toHaveLength(1);
      expect(stored[0].tokenHash).toBe(hashSessionToken(result.session.token));
      expect(stored[0].tokenHash).not.toContain(result.session.token);

      const user = await findSessionUser(db, result.session.token, now);
      expect(user).toMatchObject({ username, role, className });
      expect(user).not.toHaveProperty("passwordHash");
    }
  });

  it("accepts the canonical username regardless of case and surrounding spaces", async () => {
    const result = await signIn("  Student.10A.01 ", demoPasswords.student);
    expect(result.status).toBe("success");
  });

  it("gives the same answer for a wrong password and an unknown account, without a session", async () => {
    expect(await signIn("student.10a.01", demoPasswords.teacher)).toEqual({
      status: "invalid",
    });
    expect(await signIn("no.such.student", demoPasswords.student)).toEqual({
      status: "invalid",
    });
    expect(await signIn("", "")).toEqual({ status: "invalid" });
    expect(await signIn("a".repeat(65), demoPasswords.student)).toEqual({
      status: "invalid",
    });
    expect(await signIn("admin", "x".repeat(129))).toEqual({ status: "invalid" });
    expect(await db.session.count()).toBe(0);
  });

  it("cools an account down after five failures, even for the correct password", async () => {
    const throttle = new LoginThrottle();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await signIn("teacher.math", "wrong-password", now, throttle)).status).toBe(
        "invalid",
      );
    }
    expect(await signIn("teacher.math", demoPasswords.teacher, later(1_000), throttle)).toEqual({
      status: "throttled",
      retryAfterSeconds: 59,
    });
    // Another account is unaffected by the first account's failures.
    expect((await signIn("teacher.science", demoPasswords.teacher, now, throttle)).status).toBe(
      "success",
    );
    // The cool-down is short and ends on its own.
    expect((await signIn("teacher.math", demoPasswords.teacher, later(60_000), throttle)).status).toBe(
      "success",
    );
    // A success clears earlier failures: 4 + 4 failures never reach five in a row.
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await signIn("teacher.math", "wrong-password", later(61_000), throttle);
    }
    expect((await signIn("teacher.math", demoPasswords.teacher, later(62_000), throttle)).status).toBe(
      "success",
    );
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await signIn("teacher.math", "wrong-password", later(63_000), throttle);
    }
    expect((await signIn("teacher.math", demoPasswords.teacher, later(64_000), throttle)).status).toBe(
      "success",
    );
  });

  it("forgets failures older than the ten-minute window", async () => {
    const throttle = new LoginThrottle();
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await signIn("admin", "wrong-password", now, throttle);
    }
    await signIn("admin", "wrong-password", later(10 * 60_000), throttle);
    expect((await signIn("admin", demoPasswords.admin, later(10 * 60_000 + 1), throttle)).status).toBe(
      "success",
    );
  });

  it("rejects expired, forged, and malformed session tokens", async () => {
    const result = await signIn("student.10b.04", demoPasswords.student);
    if (result.status !== "success") throw new Error("login failed");
    const { token } = result.session;

    expect(await findSessionUser(db, token, later(sessionLifetimeMs - 1))).not.toBeNull();
    expect(await findSessionUser(db, token, later(sessionLifetimeMs))).toBeNull();
    // The expired row is removed rather than left reusable.
    expect(await db.session.count()).toBe(0);

    expect(await findSessionUser(db, undefined, now)).toBeNull();
    expect(await findSessionUser(db, "short", now)).toBeNull();
    expect(await findSessionUser(db, "A".repeat(43), now)).toBeNull();
    expect(await findSessionUser(db, `${"B".repeat(42)}!`, now)).toBeNull();
  });

  it("ends only the signed-out session and purges expired sessions on the next login", async () => {
    const phone = await signIn("student.11a.05", demoPasswords.student);
    const laptop = await signIn("student.11a.05", demoPasswords.student);
    if (phone.status !== "success" || laptop.status !== "success") {
      throw new Error("login failed");
    }
    await deleteSession(db, phone.session.token);
    expect(await findSessionUser(db, phone.session.token, now)).toBeNull();
    expect(await findSessionUser(db, laptop.session.token, now)).not.toBeNull();

    await signIn("admin", demoPasswords.admin, later(sessionLifetimeMs + 1));
    expect(await findSessionUser(db, laptop.session.token, now)).toBeNull();
    expect(await db.session.count()).toBe(1);
  });
});
