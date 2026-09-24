import Link from "next/link";
import { redirect } from "next/navigation";
import { Countdown } from "@/components/countdown";
import { SiteShell } from "@/components/site-shell";
import { formatDateTime, formatHundredths } from "@/i18n/format";
import { getLocale } from "@/i18n/locale";
import { messages } from "@/i18n/messages";
import { getAttemptView } from "@/server/attempts/attempts";
import { requireRole } from "@/server/auth/current-user";
import { getDatabase } from "@/server/db";

export default async function AttemptPage({
  params,
}: {
  params: Promise<{ quizId: string }>;
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
                  <div className="question__heading">
                    <h2>{copy.attempt.questionOf(question.position, total)}</h2>
                    <span className="badge badge--soft">
                      {copy.questions.pointsValue(
                        formatHundredths(question.pointsHundredths),
                      )}
                    </span>
                  </div>
                  <p className="question__text" dir="auto">
                    {question.text}
                  </p>
                  <ul className="option-list">
                    {question.options.map((option) => (
                      <li key={option.id} className="option">
                        <span dir="auto">{option.text}</span>
                      </li>
                    ))}
                  </ul>
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
