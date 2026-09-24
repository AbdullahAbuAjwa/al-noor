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

function postForm(path, fields, headers = {}) {
  return request(path, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", ...headers },
    body: new URLSearchParams(fields).toString(),
    redirect: "manual",
  });
}

function sessionCookie(response) {
  const match = (response.headers.get("set-cookie") ?? "").match(
    /al_noor_session=([^;]*)/,
  );
  return match?.[1] ? `al_noor_session=${match[1]}` : null;
}

const demoAccounts = [
  {
    username: "student.10a.01",
    password: "StudentDemo2026!",
    home: "/student",
    visible: "رياضيات الصف العاشر: حساب وجبر",
    hidden: ["علوم الصف العاشر: مفاهيم أساسية", "مسودة: مراجعة تاريخية قصيرة"],
  },
  {
    username: "teacher.math",
    password: "TeacherDemo2026!",
    home: "/teacher",
    visible: "math-10a-demo",
    hidden: ["science-10b-demo", "history-10a-draft"],
  },
  {
    username: "admin",
    password: "AdminDemo2026!",
    home: "/admin",
    visible: "نظرة عامة على المركز",
    hidden: [],
  },
];

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
  const location = change.headers.get("location");
  assert.equal(location, "/", "the redirect must keep the browser's host and port");
  const setCookie = change.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /al_noor_locale=en/);
  assert.match(setCookie, /httponly/i);
  assert.match(setCookie, /samesite=lax/i);
  const cookie = setCookie.split(";")[0];

  const english = await request(location, { headers: { cookie } });
  assert.equal(english.status, 200);
  const englishHtml = await english.text();
  assert.match(englishHtml, /<html[^>]*lang="en"[^>]*dir="ltr"/);
  assert.match(englishHtml, /Short quizzes, clear results/);
  assert.match(englishHtml, /<title>Al Noor Educational Center<\/title>/);

  // Switching language returns to the page it was used on, never off-site.
  const fromLogin = await postForm("/api/locale", { locale: "ar", returnTo: "/login" });
  assert.equal(fromLogin.status, 303);
  assert.equal(fromLogin.headers.get("location"), "/login");
  const offSite = await postForm("/api/locale", {
    locale: "ar",
    returnTo: "//evil.example/",
  });
  assert.equal(offSite.headers.get("location"), "/");

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

test("protected areas require a session and redirect relatively to the login page", async () => {
  for (const path of ["/student", "/teacher", "/admin"]) {
    const response = await request(path, { redirect: "manual" });
    assert.equal(response.status, 307, path);
    assert.equal(response.headers.get("location"), `/login?next=${encodeURIComponent(path)}`);
  }
  const login = await request("/login");
  assert.equal(login.status, 200);
  const html = await login.text();
  assert.match(html, /<html[^>]*lang="ar"[^>]*dir="rtl"/);
  assert.match(html, /name="username"/);
  assert.match(html, /autoComplete="current-password"|autocomplete="current-password"/);
});

test("a failed or cross-site sign-in never issues a session", async () => {
  // An unknown account keeps demo accounts free of throttling between runs.
  const wrong = await postForm("/api/auth/login", {
    username: "smoke.unknown.account",
    password: "not-the-password",
  });
  assert.equal(wrong.status, 303);
  assert.match(wrong.headers.get("location") ?? "", /^\/login\?error=(invalid|throttled)$/);
  assert.equal(sessionCookie(wrong), null);

  const crossSite = await postForm(
    "/api/auth/login",
    { username: "admin", password: "AdminDemo2026!" },
    { origin: "http://evil.example" },
  );
  assert.equal(crossSite.status, 403);
  assert.equal(sessionCookie(crossSite), null);
});

test("each demo role reaches only its own area, and sign-out ends the session", async () => {
  for (const account of demoAccounts) {
    const login = await postForm("/api/auth/login", {
      username: account.username,
      password: account.password,
      next: "/admin",
    });
    assert.equal(login.status, 303, account.username);
    // A requested page outside the account's own area is ignored.
    assert.equal(login.headers.get("location"), account.home);
    const setCookie = login.headers.get("set-cookie") ?? "";
    assert.match(setCookie, /httponly/i);
    assert.match(setCookie, /samesite=lax/i);
    const cookie = sessionCookie(login);
    assert.ok(cookie, "login must issue a session cookie");

    const home = await request(account.home, { headers: { cookie } });
    assert.equal(home.status, 200);
    const html = await home.text();
    assert.ok(html.includes(account.visible), `${account.home} shows its own data`);
    for (const text of account.hidden) {
      assert.ok(!html.includes(text), `${account.home} must not show ${text}`);
    }
    assert.ok(!html.includes("scrypt$"), "password hashes never reach a page");

    for (const other of ["/student", "/teacher", "/admin"]) {
      if (other === account.home) continue;
      const denied = await request(other, { headers: { cookie }, redirect: "manual" });
      assert.equal(denied.status, 307, `${account.username} -> ${other}`);
      assert.equal(denied.headers.get("location"), account.home);
    }

    const logout = await postForm("/api/auth/logout", {}, { cookie });
    assert.equal(logout.status, 303);
    assert.equal(logout.headers.get("location"), "/login?signedOut=1");
    assert.match(logout.headers.get("set-cookie") ?? "", /al_noor_session=;/);
    const reused = await request(account.home, { headers: { cookie }, redirect: "manual" });
    assert.equal(reused.status, 307, "a signed-out cookie must not work again");
  }
});
