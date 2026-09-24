import assert from "node:assert/strict";
import { test } from "node:test";

const baseUrl = process.env.APP_URL ?? "http://127.0.0.1:3000";

function request(path, options = {}) {
  return fetch(new URL(path, baseUrl), {
    signal: AbortSignal.timeout(5_000),
    redirect: "error",
    ...options,
  });
}

test("the running server exposes an uncached health response", async () => {
  const response = await request("/api/health");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("the production package serves the Arabic page and its local assets", async () => {
  const response = await request("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /text\/html/);
  const html = await response.text();
  assert.match(html, /<html[^>]*lang="ar"[^>]*dir="rtl"/);
  assert.match(html, /مركز النور التعليمي/);

  // Standalone builds omit public/static assets unless the image copies them.
  const assets = new Set([
    "/brand-mark.svg",
    ...Array.from(html.matchAll(/(?:src|href)="([^" ]*\/_next\/static\/[^" ]+)"/g),
      (match) => match[1].replaceAll("&amp;", "&")),
  ]);
  assert.ok(assets.size > 1, "the page must reference built static assets");
  for (const asset of assets) {
    assert.equal(new URL(asset, baseUrl).origin, new URL(baseUrl).origin);
    const assetResponse = await request(asset);
    assert.equal(assetResponse.status, 200, `Missing production asset: ${asset}`);
    assert.ok((await assetResponse.arrayBuffer()).byteLength > 0, `Empty asset: ${asset}`);
  }
});

test("language selection persists and invalid locale values fall back safely", async () => {
  const change = await request("/api/locale", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "locale=en",
    redirect: "manual",
  });
  assert.equal(change.status, 303);
  assert.equal(new URL(change.headers.get("location"), baseUrl).pathname, "/");
  const setCookie = change.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /al_noor_locale=en/);
  assert.match(setCookie, /httponly/i);
  assert.match(setCookie, /samesite=lax/i);
  const cookie = setCookie.split(";")[0];

  const english = await request("/", { headers: { cookie } });
  assert.equal(english.status, 200);
  const englishHtml = await english.text();
  assert.match(englishHtml, /<html[^>]*lang="en"[^>]*dir="ltr"/);
  assert.match(englishHtml, /Your learning space is on its way/);
  assert.match(englishHtml, /<title>Al Noor Educational Center<\/title>/);

  const invalid = await request("/api/locale", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "locale=fr",
    redirect: "manual",
  });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.headers.get("set-cookie"), null);

  const fallback = await request("/", {
    headers: { cookie: "al_noor_locale=fr" },
  });
  assert.equal(fallback.status, 200);
  assert.match(await fallback.text(), /<html[^>]*lang="ar"[^>]*dir="rtl"/);
});
