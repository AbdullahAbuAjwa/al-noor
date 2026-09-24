import { getDatabase } from "@/server/db";
import { login } from "@/server/auth/login";
import { postLoginPath, safeLocalPath } from "@/server/auth/paths";
import { sessionCookieName } from "@/server/auth/session";
import {
  crossSiteRejected,
  isCrossSiteRequest,
  isSecureRequest,
  readForm,
  seeOther,
} from "@/server/http/forms";

export async function POST(request: Request) {
  if (isCrossSiteRequest(request)) return crossSiteRejected();
  const form = await readForm(request);
  const next = safeLocalPath(form?.get("next"));

  const result = form
    ? await login(await getDatabase(), {
        username: form.get("username") ?? "",
        password: form.get("password") ?? "",
      })
    : ({ status: "invalid" } as const);

  if (result.status !== "success") {
    // The username is not echoed into the URL; the form asks for it again.
    const params = new URLSearchParams({ error: result.status });
    if (next) params.set("next", next);
    return seeOther(`/login?${params}`);
  }

  const response = seeOther(postLoginPath(result.user.role, next));
  response.cookies.set(sessionCookieName, result.session.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: result.session.expiresAt,
    secure: isSecureRequest(request),
  });
  return response;
}
