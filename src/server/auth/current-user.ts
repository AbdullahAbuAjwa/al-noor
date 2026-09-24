import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Role } from "../../generated/prisma/enums";
import { getDatabase } from "../db";
import { homePathFor } from "./paths";
import {
  findSessionUser,
  sessionCookieName,
  type SessionUser,
} from "./session";

// Deduplicated per request so layouts and pages share one session lookup.
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(sessionCookieName)?.value;
  return findSessionUser(await getDatabase(), token, new Date());
});

// Every protected page calls this on the server; hidden links are not access
// control. Other roles are sent to their own area instead of seeing this one.
export async function requireRole(
  role: Role,
  path: string,
): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  if (user.role !== role) redirect(homePathFor(user.role));
  return user;
}
