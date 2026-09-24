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
import { expireOverdueAttempts } from "@/server/attempts/grading";
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
  const db = await getDatabase();
  const now = new Date();
  // An attempt past its deadline is graded from its saved answers on sight.
  await expireOverdueAttempts(db, { studentId: user.id, quizId }, now);
  const view = await getAttemptView(db, user.id, quizId, now);
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
            <section className="card" aria-labelledby="result-title">
              <h2 id="result-title">{copy.results.title}</h2>
              <p className="notice notice--info">
                {view.status === "EXPIRED"
                  ? copy.results.expired
                  : view.status === "SUBMITTED"
                    ? copy.results.submitted
                    : copy.attempt.timeOver}
              </p>
              {view.result ? (
                <>
                  <p className="result-score" dir="ltr">
                    {copy.results.scoreValue(
                      formatHundredths(view.result.scoreHundredths),
                      formatHundredths(view.result.maxScoreHundredths),
                    )}
                  </p>
                  <dl className="facts">
                    <div>
                      <dt>{copy.results.correct}</dt>
                      <dd>{view.result.correctCount}</dd>
                    </div>
                    <div>
                      <dt>{copy.results.incorrect}</dt>
                      <dd>{view.result.incorrectCount}</dd>
                    </div>
                    <div>
                      <dt>{copy.results.unanswered}</dt>
                      <dd>{view.result.unansweredCount}</dd>
                    </div>
                  </dl>
                </>
              ) : null}
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
          {active ? (
            <section className="card" id="submit" aria-labelledby="submit-title">
              <h2 id="submit-title">{copy.results.submitTitle}</h2>
              <p className="muted">{copy.results.submitNote}</p>
              <form
                action={`/api/student/quizzes/${encodeURIComponent(quizId)}/submit`}
                method="post"
              >
                <button type="submit" className="button button--primary">
                  {copy.results.submit}
                </button>
              </form>
            </section>
          ) : null}
          <p className="back-link">
            <Link href="/student">{copy.attempt.back}</Link>
          </p>
        </div>
      </main>
    </SiteShell>
  );
}
