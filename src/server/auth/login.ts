import type { Role } from "../../generated/prisma/enums";
import type { Database } from "../db/types";
import { hashPassword, verifyPassword } from "./password";
import { createSession } from "./session";
import { LoginThrottle } from "./throttle";

export type LoginResult =
  | {
      status: "success";
      user: { id: string; role: Role };
      session: { token: string; expiresAt: Date };
    }
  | { status: "invalid" }
  | { status: "throttled"; retryAfterSeconds: number };

const loginGlobal = globalThis as typeof globalThis & {
  alNoorLoginThrottle?: LoginThrottle;
  alNoorTimingHash?: Promise<string>;
};

export const defaultLoginThrottle = (loginGlobal.alNoorLoginThrottle ??=
  new LoginThrottle());

// Verifying against a real hash for unknown usernames keeps response time from
// revealing which accounts exist.
function timingHash() {
  loginGlobal.alNoorTimingHash ??= hashPassword("al-noor-unknown-account");
  return loginGlobal.alNoorTimingHash;
}

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export async function login(
  db: Database,
  input: { username: string; password: string },
  options: { now?: Date; throttle?: LoginThrottle } = {},
): Promise<LoginResult> {
  const now = options.now ?? new Date();
  const throttle = options.throttle ?? defaultLoginThrottle;
  const username = normalizeUsername(input.username);
  const { password } = input;
  if (!username || username.length > 64 || !password || password.length > 128) {
    return { status: "invalid" };
  }

  const waitMs = throttle.retryAfterMs(username, now);
  if (waitMs > 0) {
    return { status: "throttled", retryAfterSeconds: Math.ceil(waitMs / 1000) };
  }

  const user = await db.user.findUnique({
    where: { username },
    select: { id: true, role: true, passwordHash: true },
  });
  const valid = await verifyPassword(
    password,
    user?.passwordHash ?? (await timingHash()),
  );
  if (!user || !valid) {
    throttle.recordFailure(username, now);
    return { status: "invalid" };
  }

  throttle.reset(username);
  const session = await createSession(db, user.id, now);
  return { status: "success", user: { id: user.id, role: user.role }, session };
}
