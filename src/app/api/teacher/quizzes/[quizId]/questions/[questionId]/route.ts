import { getDatabase } from "@/server/db";
import { readForm, seeOther } from "@/server/http/forms";
import { notFoundResponse, teacherFromRequest } from "@/server/http/teacher";
import {
  questionError,
  questionFormBytes,
} from "@/server/quizzes/question-codes";
import {
  deleteQuestion,
  parseQuestion,
  updateQuestion,
} from "@/server/quizzes/questions";

// One endpoint per question: intent=save updates it, intent=delete removes it.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ quizId: string; questionId: string }> },
) {
  const { quizId, questionId } = await params;
  const editor = `/teacher/quizzes/${encodeURIComponent(quizId)}`;
  const guard = await teacherFromRequest(request, editor);
  if ("response" in guard) return guard.response;

  const form = await readForm(request, questionFormBytes);
  const db = await getDatabase();
  let result;
  if (form?.get("intent") === "delete") {
    result = await deleteQuestion(db, guard.teacher.id, quizId, questionId);
    if (result.ok)
      return seeOther(`${editor}?notice=questionDeleted#questions`);
  } else {
    const parsed = form
      ? parseQuestion(form)
      : ({ ok: false, field: "text" } as const);
    if (!parsed.ok) {
      return seeOther(
        `${editor}?error=${questionError(parsed.field)}#question-${encodeURIComponent(questionId)}`,
      );
    }
    result = await updateQuestion(
      db,
      guard.teacher.id,
      quizId,
      questionId,
      parsed.value,
    );
    if (result.ok) {
      return seeOther(
        `${editor}?notice=questionSaved#question-${encodeURIComponent(questionId)}`,
      );
    }
  }
  if (result.reason === "not_found") return notFoundResponse();
  return seeOther(`${editor}?error=${questionError(result.reason)}#questions`);
}
