import { NextResponse } from "next/server";

// Relative redirects keep the browser's host and published port. Next's
// request.url carries the container bind address instead (see D10).
export function seeOther(location: string) {
  return new NextResponse(null, {
    status: 303,
    headers: { Location: location, "Cache-Control": "no-store" },
  });
}

// Browsers attach Origin/Sec-Fetch-Site to form posts; reject writes that come
// from another site. SameSite=Lax cookies are the first line of defense.
export function isCrossSiteRequest(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none")
    return true;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return origin === "null" || new URL(origin).host !== host;
  } catch {
    return true;
  }
}

export function isSecureRequest(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0].trim() === "https";
  return new URL(request.url).protocol === "https:";
}

// Reads at most maxBytes, so an oversized or endless body is never buffered.
export async function readBoundedText(
  request: Request,
  maxBytes: number,
): Promise<string | null> {
  if (Number(request.headers.get("content-length") ?? 0) > maxBytes) {
    return null;
  }
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function readForm(
  request: Request,
  maxBytes = 4_096,
): Promise<URLSearchParams | null> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/x-www-form-urlencoded(?:;|$)/i.test(contentType)) {
    return null;
  }
  const body = await readBoundedText(request, maxBytes);
  return body === null ? null : new URLSearchParams(body);
}

export function crossSiteRejected() {
  return new Response("Cross-site request rejected.", {
    status: 403,
    headers: { "Cache-Control": "no-store" },
  });
}
