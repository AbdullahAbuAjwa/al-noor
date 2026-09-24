import { getDatabase } from "@/server/db";
import { readForm, seeOther } from "@/server/http/forms";
import { notFoundResponse, teacherFromRequest } from "@/server/http/teacher";
import { parsePublication, publishQuiz } from "@/server/quizzes/publish";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> },
) {
  const { quizId } = await params;
  const editor = `/teacher/quizzes/${encodeURIComponent(quizId)}`;
  const guard = await teacherFromRequest(request, editor);
  if ("response" in guard) return guard.response;

  const form = await readForm(request);
  // Server time decides whether the chosen window has already closed.
  const parsed = form
    ? parsePublication(form, new Date())
    : ({ ok: false, field: "windowFormat" } as const);
  if (!parsed.ok) return seeOther(`${editor}?error=${parsed.field}#publish`);

  const result = await publishQuiz(
    await getDatabase(),
    guard.teacher.id,
    quizId,
    parsed,
  );
  if (!result.ok) {
    if (result.reason === "not_found") return notFoundResponse();
    return seeOther(`${editor}?error=${result.reason}#publish`);
  }
  return seeOther(`${editor}?notice=published`);
}
