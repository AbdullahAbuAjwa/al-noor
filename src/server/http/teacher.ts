import "server-only";
import type { Role } from "../../generated/prisma/enums";
import { readSessionUser } from "../auth/current-user";
import type { SessionUser } from "../auth/session";
import { crossSiteRejected, isCrossSiteRequest, seeOther } from "./forms";

// Shared guard for form posts: same-site request, a live session, and the
// required role. Returns either the user or the response to send.
export async function userFromRequest(
  request: Request,
  role: Role,
  loginReturnPath: string,
): Promise<{ user: SessionUser } | { response: Response }> {
  if (isCrossSiteRequest(request)) return { response: crossSiteRejected() };
  const user = await readSessionUser();
  if (!user) {
    return {
      response: seeOther(`/login?next=${encodeURIComponent(loginReturnPath)}`),
    };
  }
  if (user.role !== role) {
    return {
      response: new Response("Not allowed for this role.", {
        status: 403,
        headers: { "Cache-Control": "no-store" },
      }),
    };
  }
  return { user };
}

export async function teacherFromRequest(
  request: Request,
  loginReturnPath: string,
): Promise<{ teacher: SessionUser } | { response: Response }> {
  const guard = await userFromRequest(request, "TEACHER", loginReturnPath);
  return "user" in guard ? { teacher: guard.user } : guard;
}

export function notFoundResponse() {
  return new Response("Not found.", {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });
}
