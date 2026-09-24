import { NextResponse } from "next/server";
import { isLocale, localeCookieName } from "@/i18n/locale";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/x-www-form-urlencoded(?:;|$)/i.test(contentType)) {
    return new Response("Expected a form submission.", { status: 415 });
  }

  const body = await request.text();
  if (body.length > 128) {
    return new Response("Form is too large.", { status: 413 });
  }
  const locale = new URLSearchParams(body).get("locale");
  if (!isLocale(locale)) {
    return new Response("Unsupported language.", { status: 400 });
  }

  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: "/" },
  });
  response.cookies.set(localeCookieName, locale, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    secure: new URL(request.url).protocol === "https:",
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
