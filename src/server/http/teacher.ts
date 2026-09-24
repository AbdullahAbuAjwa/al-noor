import "server-only";
import { readSessionUser } from "../auth/current-user";
import type { SessionUser } from "../auth/session";
import { crossSiteRejected, isCrossSiteRequest, seeOther } from "./forms";

// Shared guard for teacher form posts: same-site request, a live session, and
// the teacher role. Returns either the teacher or the response to send.
export async function teacherFromRequest(
  request: Request,
  loginReturnPath: string,
): Promise<{ teacher: SessionUser } | { response: Response }> {
  if (isCrossSiteRequest(request)) return { response: crossSiteRejected() };
  const user = await readSessionUser();
  if (!user) {
    return {
      response: seeOther(`/login?next=${encodeURIComponent(loginReturnPath)}`),
    };
  }
  if (user.role !== "TEACHER") {
    return {
      response: new Response("Teachers only.", {
        status: 403,
        headers: { "Cache-Control": "no-store" },
      }),
    };
  }
  return { teacher: user };
}

export function notFoundResponse() {
  return new Response("Not found.", {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });
}
