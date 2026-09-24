import { cookies } from "next/headers";
import { getDatabase } from "@/server/db";
import { deleteSession, sessionCookieName } from "@/server/auth/session";
import {
  crossSiteRejected,
  isCrossSiteRequest,
  isSecureRequest,
  seeOther,
} from "@/server/http/forms";

export async function POST(request: Request) {
  if (isCrossSiteRequest(request)) return crossSiteRejected();
  const token = (await cookies()).get(sessionCookieName)?.value;
  // Deleting the server row ends the session even if a copy of the cookie remains.
  await deleteSession(await getDatabase(), token);

  const response = seeOther("/login?signedOut=1");
  response.cookies.set(sessionCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: isSecureRequest(request),
  });
  return response;
}
