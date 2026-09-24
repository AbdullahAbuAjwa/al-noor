import { getDatabase } from "@/server/db";
import { readForm, seeOther } from "@/server/http/forms";
import { notFoundResponse, teacherFromRequest } from "@/server/http/teacher";
import {
  parseDraftSettings,
  updateDraftSettings,
} from "@/server/quizzes/drafts";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> },
) {
  const { quizId } = await params;
  const editor = `/teacher/quizzes/${encodeURIComponent(quizId)}`;
  const guard = await teacherFromRequest(request, editor);
  if ("response" in guard) return guard.response;

  const form = await readForm(request);
  const parsed = form
    ? parseDraftSettings(form)
    : ({ ok: false, field: "title" } as const);
  if (!parsed.ok) return seeOther(`${editor}?error=${parsed.field}`);

  const result = await updateDraftSettings(
    await getDatabase(),
    guard.teacher.id,
    quizId,
    parsed.value,
  );
  // Another teacher's quiz is reported exactly like a missing one.
  if (!result.ok && result.reason === "not_found") return notFoundResponse();
  if (!result.ok) return seeOther(`${editor}?error=${result.reason}`);
  return seeOther(`${editor}?notice=saved`);
}
