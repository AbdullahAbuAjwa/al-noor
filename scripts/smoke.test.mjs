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
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...headers,
    },
    // Arrays become repeated fields, as a browser sends checked checkboxes.
    body: new URLSearchParams(
      Object.entries(fields).flatMap(([name, value]) =>
        [value].flat().map((item) => [name, item]),
      ),
    ).toString(),
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
    ...Array.from(
      html.matchAll(/(?:src|href)="([^" ]*\/_next\/static\/[^" ]+)"/g),
      (match) => match[1].replaceAll("&amp;", "&"),
    ),
  ]);
  assert.ok(assets.size > 1, "the page must reference built static assets");
  for (const asset of assets) {
    assert.equal(new URL(asset, baseUrl).origin, new URL(baseUrl).origin);
    const assetResponse = await request(asset);
    assert.equal(
      assetResponse.status,
      200,
      `Missing production asset: ${asset}`,
    );
    assert.ok(
      (await assetResponse.arrayBuffer()).byteLength > 0,
      `Empty asset: ${asset}`,
    );
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
  assert.equal(
    location,
    "/",
    "the redirect must keep the browser's host and port",
  );
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
  const fromLogin = await postForm("/api/locale", {
    locale: "ar",
    returnTo: "/login",
  });
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
    assert.equal(
      response.headers.get("location"),
      `/login?next=${encodeURIComponent(path)}`,
    );
  }
  const login = await request("/login");
  assert.equal(login.status, 200);
  const html = await login.text();
  assert.match(html, /<html[^>]*lang="ar"[^>]*dir="rtl"/);
  assert.match(html, /name="username"/);
  assert.match(
    html,
    /autoComplete="current-password"|autocomplete="current-password"/,
  );
});

test("switching language on the sign-in page keeps its message and requested page", async () => {
  const path = "/login?error=invalid&next=%2Fstudent";
  const page = await request(path);
  const html = await page.text();
  assert.match(
    html,
    /name="returnTo" value="\/login\?error=invalid&amp;next=%2Fstudent"/,
  );

  const change = await postForm("/api/locale", {
    locale: "en",
    returnTo: path,
  });
  assert.equal(change.status, 303);
  assert.equal(change.headers.get("location"), path);
  const cookie = (change.headers.get("set-cookie") ?? "").split(";")[0];
  const english = await (await request(path, { headers: { cookie } })).text();
  assert.match(english, /The username or password is incorrect\./);
  assert.match(english, /name="next" value="\/student"/);
});

test("a failed or cross-site sign-in never issues a session", async () => {
  // An unknown account keeps demo accounts free of throttling between runs.
  const wrong = await postForm("/api/auth/login", {
    username: "smoke.unknown.account",
    password: "not-the-password",
  });
  assert.equal(wrong.status, 303);
  assert.match(
    wrong.headers.get("location") ?? "",
    /^\/login\?error=(invalid|throttled)$/,
  );
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
    assert.ok(
      html.includes(account.visible),
      `${account.home} shows its own data`,
    );
    for (const text of account.hidden) {
      assert.ok(!html.includes(text), `${account.home} must not show ${text}`);
    }
    assert.ok(!html.includes("scrypt$"), "password hashes never reach a page");

    for (const other of ["/student", "/teacher", "/admin"]) {
      if (other === account.home) continue;
      const denied = await request(other, {
        headers: { cookie },
        redirect: "manual",
      });
      assert.equal(denied.status, 307, `${account.username} -> ${other}`);
      assert.equal(denied.headers.get("location"), account.home);
    }

    const logout = await postForm("/api/auth/logout", {}, { cookie });
    assert.equal(logout.status, 303);
    assert.equal(logout.headers.get("location"), "/login?signedOut=1");
    assert.match(logout.headers.get("set-cookie") ?? "", /al_noor_session=;/);
    const reused = await request(account.home, {
      headers: { cookie },
      redirect: "manual",
    });
    assert.equal(reused.status, 307, "a signed-out cookie must not work again");
  }
});

// Checks that create records run only when SMOKE_WRITES=1 (CI's throwaway
// database), so a local run never adds test drafts to the demo data.
const allowWrites = process.env.SMOKE_WRITES === "1";

async function signIn(username, password) {
  const login = await postForm("/api/auth/login", { username, password });
  assert.equal(login.status, 303, `sign-in failed for ${username}`);
  return sessionCookie(login);
}

async function signOut(cookie) {
  await postForm("/api/auth/logout", {}, { cookie });
}

test("quiz authoring pages and form posts enforce ownership and draft-only edits", async () => {
  const math = await signIn("teacher.math", "TeacherDemo2026!");
  const science = await signIn("teacher.science", "TeacherDemo2026!");
  const student = await signIn("student.10a.01", "StudentDemo2026!");
  const published = "/teacher/quizzes/demo-quiz-math-10a-demo";
  try {
    const form = await request("/teacher/quizzes/new", {
      headers: { cookie: math },
    });
    assert.equal(form.status, 200);
    const html = await form.text();
    // Only the teacher's own classes are offered.
    assert.match(html, /value="demo-class-10a"/);
    assert.match(html, /value="demo-class-10b"/);
    assert.doesNotMatch(html, /value="demo-class-11a"/);

    const own = await request(published, { headers: { cookie: math } });
    assert.equal(own.status, 200);
    assert.doesNotMatch(
      await own.text(),
      /\/settings"/,
      "published quizzes have no edit form",
    );
    const other = await request(published, { headers: { cookie: science } });
    assert.equal(other.status, 404, "another teacher's quiz must look missing");

    const fields = {
      title: "Smoke draft",
      classId: "demo-class-10a",
      durationMinutes: "20",
      penaltyPercent: "0",
    };
    const asStudent = await postForm("/api/teacher/quizzes", fields, {
      cookie: student,
    });
    assert.equal(asStudent.status, 403);
    const signedOut = await postForm("/api/teacher/quizzes", fields);
    assert.equal(signedOut.status, 303);
    assert.equal(
      signedOut.headers.get("location"),
      "/login?next=%2Fteacher%2Fquizzes%2Fnew",
    );
    const foreign = await postForm(
      `/api/teacher/quizzes/demo-quiz-math-10a-demo/settings`,
      fields,
      {
        cookie: science,
      },
    );
    assert.equal(foreign.status, 404);
    const locked = await postForm(
      `/api/teacher/quizzes/demo-quiz-math-10a-demo/settings`,
      fields,
      {
        cookie: math,
      },
    );
    assert.equal(locked.status, 303);
    assert.equal(locked.headers.get("location"), `${published}?error=locked`);
    const untaught = await postForm(
      "/api/teacher/quizzes",
      { ...fields, classId: "demo-class-11a" },
      { cookie: math },
    );
    assert.equal(
      untaught.headers.get("location"),
      "/teacher/quizzes/new?error=classes",
    );
  } finally {
    await Promise.all([math, science, student].map(signOut));
  }
});

test(
  "a teacher creates and edits a draft",
  { skip: !allowWrites },
  async () => {
    const math = await signIn("teacher.math", "TeacherDemo2026!");
    try {
      const created = await postForm(
        "/api/teacher/quizzes",
        {
          title: "Smoke draft",
          classId: "demo-class-10b",
          durationMinutes: "15",
          penaltyPercent: "12.5",
        },
        { cookie: math },
      );
      assert.equal(created.status, 303);
      const location = created.headers.get("location") ?? "";
      assert.match(
        location,
        /^\/teacher\/quizzes\/[A-Za-z0-9_-]+\?notice=created$/,
      );
      const editor = location.split("?")[0];
      const page = await (
        await request(editor, { headers: { cookie: math } })
      ).text();
      assert.match(page, /Smoke draft/);
      assert.match(page, /value="12.5"/);

      const saved = await postForm(
        `/api/teacher/quizzes/${editor.split("/").pop()}/settings`,
        {
          title: "Smoke draft (edited)",
          classId: ["demo-class-10a", "demo-class-10b"],
          durationMinutes: "30",
          penaltyPercent: "0",
        },
        { cookie: math },
      );
      assert.equal(saved.headers.get("location"), `${editor}?notice=saved`);
      const list = await (
        await request("/teacher", { headers: { cookie: math } })
      ).text();
      assert.match(list, /Smoke draft \(edited\)/);

      // Questions: add, edit, and delete on the same draft.
      const quizId = editor.split("/").pop();
      const questionFields = {
        text: "Smoke question: 2 + 2?",
        points: "1.5",
        option1: "3",
        option2: "4",
        option3: "5",
        option4: "22",
        correctOption: "2",
      };
      const added = await postForm(
        `/api/teacher/quizzes/${quizId}/questions`,
        questionFields,
        { cookie: math },
      );
      assert.equal(
        added.headers.get("location"),
        `${editor}?notice=questionAdded#questions`,
      );
      const withQuestion = await (
        await request(editor, { headers: { cookie: math } })
      ).text();
      const questionId = withQuestion.match(
        /id="question-([A-Za-z0-9_-]+)"/,
      )?.[1];
      assert.ok(questionId, "the added question is listed");
      const edited = await postForm(
        `/api/teacher/quizzes/${quizId}/questions/${questionId}`,
        { ...questionFields, text: "Smoke question (edited)", intent: "save" },
        { cookie: math },
      );
      assert.match(
        edited.headers.get("location") ?? "",
        /notice=questionSaved/,
      );
      assert.match(
        await (await request(editor, { headers: { cookie: math } })).text(),
        /Smoke question \(edited\)/,
      );
      const removed = await postForm(
        `/api/teacher/quizzes/${quizId}/questions/${questionId}`,
        { intent: "delete" },
        { cookie: math },
      );
      assert.match(
        removed.headers.get("location") ?? "",
        /notice=questionDeleted/,
      );
      assert.doesNotMatch(
        await (await request(editor, { headers: { cookie: math } })).text(),
        /Smoke question/,
      );
    } finally {
      await signOut(math);
    }
  },
);

test("question endpoints enforce ownership and never change a published quiz", async () => {
  const math = await signIn("teacher.math", "TeacherDemo2026!");
  const science = await signIn("teacher.science", "TeacherDemo2026!");
  const student = await signIn("student.10a.01", "StudentDemo2026!");
  const base = "/api/teacher/quizzes/demo-quiz-math-10a-demo/questions";
  const question = `${base}/demo-question-math-10a-demo-1`;
  const fields = {
    text: "Changed",
    points: "1",
    option1: "a",
    option2: "b",
    option3: "c",
    option4: "d",
    correctOption: "1",
  };
  try {
    assert.equal(
      (await postForm(base, fields, { cookie: student })).status,
      403,
    );
    assert.equal(
      (await postForm(base, fields, { cookie: science })).status,
      404,
    );
    for (const [path, body] of [
      [base, fields],
      [question, { ...fields, intent: "save" }],
      [question, { intent: "delete" }],
    ]) {
      const locked = await postForm(path, body, { cookie: math });
      assert.equal(locked.status, 303);
      assert.equal(
        locked.headers.get("location"),
        "/teacher/quizzes/demo-quiz-math-10a-demo?error=locked#questions",
      );
    }
    const page = await (
      await request("/teacher/quizzes/demo-quiz-math-10a-demo", {
        headers: { cookie: math },
      })
    ).text();
    assert.match(page, /id="question-demo-question-math-10a-demo-15"/);
    assert.doesNotMatch(
      page,
      /name="intent"/,
      "published questions have no edit forms",
    );
  } finally {
    await Promise.all([math, science, student].map(signOut));
  }
});

// datetime-local value on an Amman wall clock, as the publish form expects.
function ammanInput(date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Amman",
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

test("publishing is limited to the owner's drafts", async () => {
  const math = await signIn("teacher.math", "TeacherDemo2026!");
  const science = await signIn("teacher.science", "TeacherDemo2026!");
  const student = await signIn("student.10a.01", "StudentDemo2026!");
  const endpoint = "/api/teacher/quizzes/demo-quiz-math-10a-demo/publish";
  const fields = {
    confirm: "yes",
    opensAt: ammanInput(new Date()),
    closesAt: ammanInput(new Date(Date.now() + 2 * 86_400_000)),
  };
  try {
    assert.equal(
      (await postForm(endpoint, fields, { cookie: student })).status,
      403,
    );
    assert.equal(
      (await postForm(endpoint, fields, { cookie: science })).status,
      404,
    );
    const unconfirmed = await postForm(
      endpoint,
      { ...fields, confirm: "" },
      { cookie: math },
    );
    assert.match(
      unconfirmed.headers.get("location") ?? "",
      /error=confirm#publish$/,
    );
    const locked = await postForm(endpoint, fields, { cookie: math });
    assert.match(locked.headers.get("location") ?? "", /error=locked#publish$/);
  } finally {
    await Promise.all([math, science, student].map(signOut));
  }
});

test(
  "a published quiz reaches students of its class",
  { skip: !allowWrites },
  async () => {
    const science = await signIn("teacher.science", "TeacherDemo2026!");
    const student = await signIn("student.11a.01", "StudentDemo2026!");
    const title = "Smoke published quiz";
    try {
      const created = await postForm(
        "/api/teacher/quizzes",
        {
          title,
          classId: "demo-class-11a",
          durationMinutes: "20",
          penaltyPercent: "0",
        },
        { cookie: science },
      );
      const quizId = (created.headers.get("location") ?? "")
        .split("?")[0]
        .split("/")
        .pop();
      const editor = `/teacher/quizzes/${quizId}`;
      const before = await (
        await request("/student", { headers: { cookie: student } })
      ).text();
      assert.ok(
        !before.includes(title),
        "a draft must stay hidden from students",
      );

      const window = {
        confirm: "yes",
        opensAt: ammanInput(new Date(Date.now() - 3_600_000)),
        closesAt: ammanInput(new Date(Date.now() + 2 * 86_400_000)),
      };
      const empty = await postForm(
        `/api/teacher/quizzes/${quizId}/publish`,
        window,
        {
          cookie: science,
        },
      );
      assert.equal(
        empty.headers.get("location"),
        `${editor}?error=noQuestions#publish`,
      );

      await postForm(
        `/api/teacher/quizzes/${quizId}/questions`,
        {
          text: "What is H2O?",
          points: "2",
          option1: "Salt",
          option2: "Water",
          option3: "Oxygen",
          option4: "Hydrogen",
          correctOption: "2",
        },
        { cookie: science },
      );
      const published = await postForm(
        `/api/teacher/quizzes/${quizId}/publish`,
        window,
        {
          cookie: science,
        },
      );
      assert.equal(
        published.headers.get("location"),
        `${editor}?notice=published`,
      );

      const after = await (
        await request("/student", { headers: { cookie: student } })
      ).text();
      assert.ok(after.includes(title), "the class sees the published quiz");
      const other = await signIn("student.10a.01", "StudentDemo2026!");
      const otherClass = await (
        await request("/student", { headers: { cookie: other } })
      ).text();
      await signOut(other);
      assert.ok(!otherClass.includes(title), "other classes do not");
      const settings = await postForm(
        `/api/teacher/quizzes/${quizId}/settings`,
        {
          title: "Changed",
          classId: "demo-class-11a",
          durationMinutes: "20",
          penaltyPercent: "0",
        },
        { cookie: science },
      );
      assert.equal(settings.headers.get("location"), `${editor}?error=locked`);
    } finally {
      await Promise.all([science, student].map(signOut));
    }
  },
);

test("students reach only their class's quizzes and attempts", async () => {
  const tenB = await signIn("student.10b.01", "StudentDemo2026!");
  const tenA = await signIn("student.10a.01", "StudentDemo2026!");
  const teacher = await signIn("teacher.math", "TeacherDemo2026!");
  const quiz = "/student/quizzes/demo-quiz-math-10a-demo";
  const start = "/api/student/quizzes/demo-quiz-math-10a-demo/start";
  try {
    const own = await request(quiz, { headers: { cookie: tenA } });
    assert.equal(own.status, 200);
    assert.match(await own.text(), /رياضيات الصف العاشر/);
    assert.equal((await request(quiz, { headers: { cookie: tenB } })).status, 404);
    assert.equal((await postForm(start, {}, { cookie: tenB })).status, 404);
    assert.equal((await postForm(start, {}, { cookie: teacher })).status, 403);
    const signedOut = await postForm(start, {});
    assert.equal(signedOut.headers.get("location"), `/login?next=${encodeURIComponent(quiz)}`);
    // No attempt of their own: the attempt page sends them to the quiz page.
    const attempt = await request(`${quiz}/attempt`, {
      headers: { cookie: tenB },
      redirect: "manual",
    });
    assert.equal(attempt.status, 307);
    assert.equal(attempt.headers.get("location"), quiz);
  } finally {
    await Promise.all([tenB, tenA, teacher].map(signOut));
  }
});

test("starting twice resumes one timed attempt without answer keys", { skip: !allowWrites }, async () => {
  const cookie = await signIn("student.10a.04", "StudentDemo2026!");
  const quiz = "/student/quizzes/demo-quiz-math-10a-demo";
  const start = "/api/student/quizzes/demo-quiz-math-10a-demo/start";
  try {
    const first = await postForm(start, {}, { cookie });
    assert.equal(first.status, 303);
    assert.equal(first.headers.get("location"), `${quiz}/attempt`);
    const page = await (await request(`${quiz}/attempt`, { headers: { cookie } })).text();
    assert.match(page, /role="timer"/);
    assert.match(page, /id="q-15"/);
    assert.doesNotMatch(page, /correctOption/);
    const deadline = page.match(/ينتهي الوقت: ([^<]+)/)?.[1];
    assert.ok(deadline, "the page shows the fixed deadline");

    const second = await postForm(start, {}, { cookie });
    assert.equal(second.headers.get("location"), `${quiz}/attempt`);
    const again = await (await request(`${quiz}/attempt`, { headers: { cookie } })).text();
    assert.equal(again.match(/ينتهي الوقت: ([^<]+)/)?.[1], deadline, "resuming keeps the deadline");
  } finally {
    await signOut(cookie);
  }
});
