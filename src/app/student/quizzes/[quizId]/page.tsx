import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { SiteShell } from "@/components/site-shell";
import {
  formatDateTime,
  formatHundredths,
  formatPercentFromBps,
} from "@/i18n/format";
import { getLocale } from "@/i18n/locale";
import { messages } from "@/i18n/messages";
import { pickMessage } from "@/i18n/pick";
import { getStudentQuiz } from "@/server/attempts/attempts";
import { requireRole } from "@/server/auth/current-user";
import { getDatabase } from "@/server/db";

export default async function StudentQuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ quizId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { quizId } = await params;
  const path = `/student/quizzes/${encodeURIComponent(quizId)}`;
  const user = await requireRole("STUDENT", path);
  // Drafts and other classes' quizzes are reported as missing.
  const quiz = await getStudentQuiz(await getDatabase(), user, quizId, new Date());
  if (!quiz) notFound();

  const locale = await getLocale();
  const copy = messages[locale];
  const error = pickMessage(copy.attempt.errors, (await searchParams).error);
  const penalty = formatPercentFromBps(quiz.penaltyBps);

  let action;
  if (quiz.attempt?.status === "IN_PROGRESS") {
    action = (
      <>
        <p className="notice notice--info">{copy.attempt.inProgress}</p>
        <Link className="button button--primary" href={`${path}/attempt`}>
          {copy.attempt.resume}
        </Link>
      </>
    );
  } else if (quiz.attempt) {
    action = <p className="notice notice--info">{copy.attempt.finished}</p>;
  } else if (quiz.availability === "open") {
    action = (
      <form action={`/api/student/quizzes/${encodeURIComponent(quiz.id)}/start`} method="post">
        <p className={quiz.availableMinutes < quiz.durationMinutes ? "notice notice--warning" : "summary-line"}>
          {quiz.availableMinutes < quiz.durationMinutes
            ? copy.attempt.shortened(quiz.availableMinutes)
            : copy.attempt.availableNow(quiz.availableMinutes)}
        </p>
        <button type="submit" className="button button--primary">
          {copy.attempt.start}
        </button>
      </form>
    );
  } else {
    action = (
      <p className="notice notice--info">{copy.attempt[quiz.availability]}</p>
    );
  }

  return (
    <SiteShell locale={locale} currentPath={path} user={user}>
      <main id="main-content" className="page">
        <div className="container container--narrow">
          <PageHeader
            eyebrow={copy.student.eyebrow(user.className ?? "")}
            title={quiz.title}
          />
          {error ? (
            <p className="notice notice--error" role="alert">
              {error}
            </p>
          ) : null}
          <section className="card">
            <dl className="facts">
              <div>
                <dt>{copy.quiz.teacher}</dt>
                <dd>{quiz.teacherName}</dd>
              </div>
              <div>
                <dt>{copy.quiz.questions}</dt>
                <dd>{quiz.questionCount}</dd>
              </div>
              <div>
                <dt>{copy.attempt.totalPoints}</dt>
                <dd>{formatHundredths(quiz.totalPointsHundredths)}</dd>
              </div>
              <div>
                <dt>{copy.quiz.duration}</dt>
                <dd>{copy.quiz.minutes(quiz.durationMinutes)}</dd>
              </div>
              <div>
                <dt>{copy.quiz.opens}</dt>
                <dd>{formatDateTime(quiz.opensAt, locale)}</dd>
              </div>
              <div>
                <dt>{copy.quiz.closes}</dt>
                <dd>{formatDateTime(quiz.closesAt, locale)}</dd>
              </div>
            </dl>
          </section>
          <section className="card" aria-labelledby="rules-title">
            <h2 id="rules-title">{copy.attempt.beforeStart}</h2>
            <ul className="rules">
              <li>{copy.attempt.oneAttempt}</li>
              <li>{copy.attempt.timerRule}</li>
              <li>{copy.attempt.deadlineRule}</li>
              <li>
                {quiz.penaltyBps === 0
                  ? copy.attempt.scoringNoPenalty
                  : copy.attempt.scoringPenalty(penalty)}
              </li>
            </ul>
            <div className="attempt-action">{action}</div>
          </section>
          <p className="back-link">
            <Link href="/student">{copy.attempt.back}</Link>
          </p>
        </div>
      </main>
    </SiteShell>
  );
}
