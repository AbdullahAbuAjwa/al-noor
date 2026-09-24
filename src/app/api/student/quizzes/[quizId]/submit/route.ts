import { finalizeAttempt } from "@/server/attempts/grading";
import { getDatabase } from "@/server/db";
import { seeOther } from "@/server/http/forms";
import { notFoundResponse, userFromRequest } from "@/server/http/teacher";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> },
) {
  const { quizId } = await params;
  const attemptPage = `/student/quizzes/${encodeURIComponent(quizId)}/attempt`;
  const guard = await userFromRequest(request, "STUDENT", attemptPage);
  if ("response" in guard) return guard.response;

  // Grading happens only here, on the server, from saved answers (D06/D07).
  const result = await finalizeAttempt(
    await getDatabase(),
    guard.user.id,
    quizId,
    new Date(),
    "submit",
  );
  if (!result.ok) return notFoundResponse();
  return seeOther(attemptPage);
}
