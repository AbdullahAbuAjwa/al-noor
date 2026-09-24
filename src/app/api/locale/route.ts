import { isLocale, localeCookieName } from "@/i18n/locale";
import { safeLocalPath } from "@/server/auth/paths";
import {
  crossSiteRejected,
  isCrossSiteRequest,
  isSecureRequest,
  readForm,
  seeOther,
} from "@/server/http/forms";

export async function POST(request: Request) {
  if (isCrossSiteRequest(request)) return crossSiteRejected();
  const form = await readForm(request, 1_024);
  if (!form) {
    return new Response("Expected a small form submission.", { status: 415 });
  }
  const locale = form.get("locale");
  if (!isLocale(locale)) {
    return new Response("Unsupported language.", { status: 400 });
  }

  // Return to the same page so switching language never abandons a screen.
  const response = seeOther(safeLocalPath(form.get("returnTo")) ?? "/");
  response.cookies.set(localeCookieName, locale, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    secure: isSecureRequest(request),
  });
  return response;
}
