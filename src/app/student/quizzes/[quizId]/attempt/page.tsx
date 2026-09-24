import Link from "next/link";
import { redirect } from "next/navigation";
import { AnswerQuestion } from "@/components/answer-question";
import { Countdown } from "@/components/countdown";
import { SiteShell } from "@/components/site-shell";
import { formatDateTime, formatHundredths } from "@/i18n/format";
import { getLocale } from "@/i18n/locale";
import { messages } from "@/i18n/messages";
import { pickMessage } from "@/i18n/pick";
import { getAttemptView } from "@/server/attempts/attempts";
import { requireRole } from "@/server/auth/current-user";
import { getDatabase } from "@/server/db";

export default async function AttemptPage({
  params,
  searchParams,
}: {
  params: Promise<{ quizId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { quizId } = await params;
  const quizPage = `/student/quizzes/${encodeURIComponent(quizId)}`;
  const user = await requireRole("STUDENT", `${quizPage}/attempt`);
  // Only the signed-in student's own attempt is ever loaded.
  const view = await getAttemptView(await getDatabase(), user.id, quizId, new Date());
  if (!view) redirect(quizPage);

  const locale = await getLocale();
  const copy = messages[locale];
  const active = view.status === "IN_PROGRESS" && !view.timeOver;
  const total = view.questions.length;
  const query = await searchParams;
  const error = pickMessage(copy.attempt.errors, query.error);
  const notice = pickMessage(copy.attempt.notices, query.notice);
  const answersAction = `/api/student/quizzes/${encodeURIComponent(quizId)}/answers`;

  return (
    <SiteShell locale={locale} currentPath={`${quizPage}/attempt`} user={user}>
      <main id="main-content" className="page">
        <div className="container container--narrow">
          <header className="attempt-bar">
            <h1 className="attempt-bar__title">{view.quiz.title}</h1>
            {active ? (
              <>
                <Countdown
                  remainingMs={view.remainingMs}
                  label={copy.attempt.timeLeft}
                  expiredLabel={copy.attempt.timeOver}
                />
                <p className="attempt-bar__deadline muted small">
                  {copy.attempt.endsAt(formatDateTime(view.deadlineAt, locale))}
                </p>
              </>
            ) : null}
          </header>
          {active ? (
            <p className="muted small">{copy.attempt.savingNote}</p>
          ) : null}
          {active && error ? (
            <p className="notice notice--error" role="alert">
              {error}
            </p>
          ) : active && notice ? (
            <p className="notice notice--info" role="status">
              {notice}
            </p>
          ) : null}
          {!active ? (
            <section className="card">
              <p className="notice notice--info">
                {view.status === "IN_PROGRESS"
                  ? copy.attempt.timeOver
                  : copy.attempt.finished}
              </p>
            </section>
          ) : (
            <ol className="attempt-questions">
              {view.questions.map((question) => (
                <li
                  key={question.id}
                  id={`q-${question.position}`}
                  className="card attempt-question"
                >
                  <AnswerQuestion
                    action={answersAction}
                    questionId={question.id}
                    position={question.position}
                    text={question.text}
                    options={question.options}
                    savedOptionId={view.answers[question.id] ?? null}
                    labels={{
                      heading: copy.attempt.questionOf(question.position, total),
                      points: copy.questions.pointsValue(
                        formatHundredths(question.pointsHundredths),
                      ),
                      save: copy.attempt.save,
                      clear: copy.attempt.clear,
                      saving: copy.attempt.saving,
                      saved: copy.attempt.saved,
                      cleared: copy.attempt.cleared,
                      failed: copy.attempt.failed,
                      retry: copy.attempt.retry,
                    }}
                  />
                </li>
              ))}
            </ol>
          )}
          <p className="back-link">
            <Link href="/student">{copy.attempt.back}</Link>
          </p>
        </div>
      </main>
    </SiteShell>
  );
}
