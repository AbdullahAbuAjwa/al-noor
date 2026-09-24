import { saveAnswer } from "@/server/attempts/answers";
import { getDatabase } from "@/server/db";
import { readForm, seeOther } from "@/server/http/forms";
import { notFoundResponse, userFromRequest } from "@/server/http/teacher";

const statusCodes = {
  invalid: 400,
  not_found: 404,
  time_over: 409,
  finished: 409,
} as const;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> },
) {
  const { quizId } = await params;
  const attemptPage = `/student/quizzes/${encodeURIComponent(quizId)}/attempt`;
  const guard = await userFromRequest(request, "STUDENT", attemptPage);
  if ("response" in guard) return guard.response;

  const form = await readForm(request);
  const clear = form?.get("intent") === "clear";
  const result = await saveAnswer(
    await getDatabase(),
    guard.user.id,
    quizId,
    form?.get("questionId") ?? "",
    clear ? null : (form?.get("optionId") ?? ""),
    // Only the server clock decides whether the attempt is still open.
    new Date(),
  );

  // The attempt page's script asks for JSON; a plain form post gets a page.
  if ((request.headers.get("accept") ?? "").includes("application/json")) {
    return Response.json(
      result.ok
        ? { status: "saved", version: result.version }
        : { status: result.reason },
      {
        status: result.ok ? 200 : statusCodes[result.reason],
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
  if (!result.ok && result.reason === "not_found") return notFoundResponse();
  const position = /^\d{1,3}$/.test(form?.get("position") ?? "")
    ? `#q-${form?.get("position")}`
    : "";
  if (!result.ok && result.reason === "invalid") {
    return seeOther(`${attemptPage}?error=invalid${position}`);
  }
  // Saved, or the attempt is over: the page shows the server's current state.
  return seeOther(
    result.ok
      ? `${attemptPage}?notice=${clear ? "cleared" : "saved"}${position}`
      : attemptPage,
  );
}
