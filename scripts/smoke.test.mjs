import assert from "node:assert/strict";
import { test } from "node:test";

const baseUrl = process.env.APP_URL ?? "http://127.0.0.1:3000";

function request(path) {
  return fetch(new URL(path, baseUrl), {
    signal: AbortSignal.timeout(5_000),
    redirect: "error",
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
