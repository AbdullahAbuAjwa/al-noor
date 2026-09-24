import { startAttempt } from "@/server/attempts/attempts";
import { getDatabase } from "@/server/db";
import { seeOther } from "@/server/http/forms";
import { notFoundResponse, userFromRequest } from "@/server/http/teacher";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> },
) {
  const { quizId } = await params;
  const quizPage = `/student/quizzes/${encodeURIComponent(quizId)}`;
  const guard = await userFromRequest(request, "STUDENT", quizPage);
  if ("response" in guard) return guard.response;

  // Server time decides whether the quiz is open and fixes the deadline.
  const result = await startAttempt(
    await getDatabase(),
    guard.user,
    quizId,
    new Date(),
  );
  if (!result.ok) {
    if (result.reason === "not_found") return notFoundResponse();
    return seeOther(`${quizPage}?error=${result.reason}`);
  }
  return seeOther(`${quizPage}/attempt`);
}
