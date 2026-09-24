import { getDatabase } from "@/server/db";
import { readForm, seeOther } from "@/server/http/forms";
import { notFoundResponse, teacherFromRequest } from "@/server/http/teacher";
import { addQuestion, parseQuestion } from "@/server/quizzes/questions";
import {
  questionError,
  questionFormBytes,
} from "@/server/quizzes/question-codes";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> },
) {
  const { quizId } = await params;
  const editor = `/teacher/quizzes/${encodeURIComponent(quizId)}`;
  const guard = await teacherFromRequest(request, editor);
  if ("response" in guard) return guard.response;

  const form = await readForm(request, questionFormBytes);
  const parsed = form
    ? parseQuestion(form)
    : ({ ok: false, field: "text" } as const);
  if (!parsed.ok) {
    return seeOther(
      `${editor}?error=${questionError(parsed.field)}#new-question`,
    );
  }

  const result = await addQuestion(
    await getDatabase(),
    guard.teacher.id,
    quizId,
    parsed.value,
  );
  if (!result.ok) {
    if (result.reason === "not_found") return notFoundResponse();
    return seeOther(
      `${editor}?error=${questionError(result.reason)}#questions`,
    );
  }
  return seeOther(`${editor}?notice=questionAdded#questions`);
}
