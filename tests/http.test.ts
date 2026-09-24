import { describe, expect, it } from "vitest";
import {
  isCrossSiteRequest,
  readForm,
  seeOther,
} from "../src/server/http/forms";

function post(headers: Record<string, string>, body: BodyInit = "") {
  return new Request("http://0.0.0.0:3000/api/auth/login", {
    method: "POST",
    headers,
    body,
    // Required by Node for streamed request bodies.
    duplex: "half",
  } as RequestInit);
}

const form = { "content-type": "application/x-www-form-urlencoded" };

describe("form submission guards", () => {
  it("rejects form posts from another site but accepts same-origin and header-less clients", () => {
    const host = { host: "localhost:3001" };
    expect(isCrossSiteRequest(post({ ...host }))).toBe(false);
    expect(
      isCrossSiteRequest(post({ ...host, origin: "http://localhost:3001", "sec-fetch-site": "same-origin" })),
    ).toBe(false);
    expect(isCrossSiteRequest(post({ ...host, origin: "http://evil.example" }))).toBe(true);
    // Another port on the same machine is a different origin.
    expect(isCrossSiteRequest(post({ ...host, origin: "http://localhost:3000" }))).toBe(true);
    expect(isCrossSiteRequest(post({ ...host, origin: "null" }))).toBe(true);
    expect(isCrossSiteRequest(post({ ...host, "sec-fetch-site": "same-site" }))).toBe(true);
    expect(isCrossSiteRequest(post({ ...host, "sec-fetch-site": "cross-site" }))).toBe(true);
    // A trusted proxy's forwarded host is the public origin.
    expect(
      isCrossSiteRequest(
        post({ host: "app:3000", "x-forwarded-host": "quiz.example", origin: "https://quiz.example" }),
      ),
    ).toBe(false);
  });

  it("reads only small URL-encoded forms, even without a length header", async () => {
    const accepted = await readForm(post(form, "username=student.10a.01&password=x"));
    expect(accepted?.get("username")).toBe("student.10a.01");

    expect(await readForm(post({ "content-type": "application/json" }, "{}"))).toBeNull();
    expect(await readForm(post({ ...form, "content-length": "5000" }, "a=1"))).toBeNull();

    const endless = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array(1_024).fill(97));
      },
    });
    expect(await readForm(post(form, endless), 4_096)).toBeNull();
  });

  it("redirects with a relative location so the browser keeps its host and port", () => {
    const response = seeOther("/student");
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/student");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
