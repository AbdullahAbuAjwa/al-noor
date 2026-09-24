import { createHash, randomBytes } from "node:crypto";
import type { Role } from "../../generated/prisma/enums";
import type { Database } from "../db/types";

export const sessionCookieName = "al_noor_session";
// Long enough for a school day, short enough that a shared phone does not stay
// signed in indefinitely. Logout ends a session immediately.
export const sessionLifetimeMs = 12 * 60 * 60 * 1000;

const tokenPattern = /^[A-Za-z0-9_-]{43}$/;

export type SessionUser = {
  id: string;
  username: string;
  name: string;
  role: Role;
  classId: string | null;
  className: string | null;
};

// Only a hash is stored, so a copied database cannot be replayed as cookies.
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

export async function createSession(db: Database, userId: string, now: Date) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + sessionLifetimeMs);
  await db.$transaction([
    db.session.deleteMany({ where: { expiresAt: { lte: now } } }),
    db.session.create({
      data: {
        tokenHash: hashSessionToken(token),
        userId,
        expiresAt,
        createdAt: now,
      },
    }),
  ]);
  return { token, expiresAt };
}

export async function findSessionUser(
  db: Database,
  token: string | undefined,
  now: Date,
): Promise<SessionUser | null> {
  if (!token || !tokenPattern.test(token)) return null;
  const tokenHash = hashSessionToken(token);
  const session = await db.session.findUnique({
    where: { tokenHash },
    select: {
      expiresAt: true,
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          classId: true,
          class: { select: { name: true } },
        },
      },
    },
  });
  if (!session) return null;
  if (session.expiresAt <= now) {
    await db.session.deleteMany({ where: { tokenHash } });
    return null;
  }
  const { class: userClass, ...user } = session.user;
  return { ...user, className: userClass?.name ?? null };
}

export async function deleteSession(db: Database, token: string | undefined) {
  if (!token || !tokenPattern.test(token)) return;
  await db.session.deleteMany({
    where: { tokenHash: hashSessionToken(token) },
  });
}
