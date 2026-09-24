import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SiteShell } from "@/components/site-shell";
import {
  formatDateTime,
  formatHundredths,
  formatPercentFromBps,
} from "@/i18n/format";
import { getLocale } from "@/i18n/locale";
import { messages } from "@/i18n/messages";
import { requireRole } from "@/server/auth/current-user";
import { listStudentQuizzes } from "@/server/dashboard/queries";
import { getDatabase } from "@/server/db";

export default async function StudentHomePage() {
  const user = await requireRole("STUDENT", "/student");
  const locale = await getLocale();
  const copy = messages[locale];
  const quizzes = await listStudentQuizzes(await getDatabase(), user, new Date());

  return (
    <SiteShell locale={locale} currentPath="/student" user={user}>
      <main id="main-content" className="page">
        <div className="container">
          <PageHeader
            eyebrow={copy.student.eyebrow(user.className ?? "")}
            title={copy.student.title}
          >
            <p className="lead">{copy.student.greeting(user.name)}</p>
            <p className="muted">{copy.student.intro}</p>
          </PageHeader>
          {quizzes.length === 0 ? (
            <p className="card empty-state">{copy.student.empty}</p>
          ) : (
            <ul className="card-list" aria-label={copy.student.title}>
              {quizzes.map((quiz) => (
                <li key={quiz.id} className="card quiz-card">
                  <div className="quiz-card__heading">
                    <h2>
                      <Link href={`/student/quizzes/${quiz.id}`}>{quiz.title}</Link>
                    </h2>
                    <span
                      className={`badge badge--${quiz.attemptStatus ? "done" : quiz.availability}`}
                    >
                      {quiz.attemptStatus
                        ? copy.quiz.attempt[quiz.attemptStatus]
                        : copy.quiz.availability[quiz.availability]}
                    </span>
                  </div>
                  <dl className="facts">
                    <div>
                      <dt>{copy.quiz.teacher}</dt>
                      <dd>{quiz.teacherName}</dd>
                    </div>
                    <div>
                      <dt>{copy.quiz.opens}</dt>
                      <dd>{formatDateTime(quiz.opensAt, locale)}</dd>
                    </div>
                    <div>
                      <dt>{copy.quiz.closes}</dt>
                      <dd>{formatDateTime(quiz.closesAt, locale)}</dd>
                    </div>
                    <div>
                      <dt>{copy.quiz.duration}</dt>
                      <dd>{copy.quiz.minutes(quiz.durationMinutes)}</dd>
                    </div>
                    <div>
                      <dt>{copy.quiz.questions}</dt>
                      <dd>{quiz.questionCount}</dd>
                    </div>
                    <div>
                      <dt>{copy.quiz.penalty}</dt>
                      <dd>
                        {quiz.penaltyBps === 0
                          ? copy.quiz.noPenalty
                          : copy.quiz.penaltyValue(
                              formatPercentFromBps(quiz.penaltyBps),
                            )}
                      </dd>
                    </div>
                  </dl>
                  {quiz.score ? (
                    <p className="summary-line" dir="auto">
                      {copy.results.score}:{" "}
                      <span dir={locale === "ar" ? "rtl" : "ltr"}>
                        {copy.results.scoreValue(
                          formatHundredths(quiz.score.scoreHundredths),
                          formatHundredths(quiz.score.maxScoreHundredths),
                        )}
                      </span>
                    </p>
                  ) : null}
                  <p className="quiz-card__action">
                    <Link
                      className={
                        quiz.attemptStatus === "IN_PROGRESS" ||
                        (!quiz.attemptStatus && quiz.availability === "open")
                          ? "button button--primary"
                          : "button button--quiet"
                      }
                      href={
                        quiz.attemptStatus === "IN_PROGRESS"
                          ? `/student/quizzes/${quiz.id}/attempt`
                          : `/student/quizzes/${quiz.id}`
                      }
                    >
                      {quiz.attemptStatus === "IN_PROGRESS"
                        ? copy.attempt.resume
                        : !quiz.attemptStatus && quiz.availability === "open"
                          ? copy.attempt.start
                          : copy.attempt.details}
                    </Link>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </SiteShell>
  );
}
