import { getDatabase } from "@/server/db";
import { readForm, seeOther } from "@/server/http/forms";
import { teacherFromRequest } from "@/server/http/teacher";
import { createDraft, parseDraftSettings } from "@/server/quizzes/drafts";

export async function POST(request: Request) {
  const guard = await teacherFromRequest(request, "/teacher/quizzes/new");
  if ("response" in guard) return guard.response;

  const form = await readForm(request);
  const parsed = form
    ? parseDraftSettings(form)
    : ({ ok: false, field: "title" } as const);
  if (!parsed.ok) return seeOther(`/teacher/quizzes/new?error=${parsed.field}`);

  const result = await createDraft(
    await getDatabase(),
    guard.teacher.id,
    parsed.value,
  );
  if (!result.ok)
    return seeOther(`/teacher/quizzes/new?error=${result.reason}`);
  return seeOther(`/teacher/quizzes/${result.quizId}?notice=created`);
}
