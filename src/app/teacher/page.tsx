import { PageHeader } from "@/components/page-header";
import { SiteShell } from "@/components/site-shell";
import {
  formatDateTime,
  formatList,
  formatPercentFromBps,
} from "@/i18n/format";
import { getLocale } from "@/i18n/locale";
import { messages } from "@/i18n/messages";
import { requireRole } from "@/server/auth/current-user";
import { listTeacherQuizzes } from "@/server/dashboard/queries";
import { getDatabase } from "@/server/db";

export default async function TeacherHomePage() {
  const user = await requireRole("TEACHER", "/teacher");
  const locale = await getLocale();
  const copy = messages[locale];
  const quizzes = await listTeacherQuizzes(await getDatabase(), user.id);

  return (
    <SiteShell locale={locale} currentPath="/teacher" user={user}>
      <main id="main-content" className="page">
        <div className="container">
          <PageHeader eyebrow={copy.teacher.eyebrow} title={copy.teacher.title}>
            <p className="muted">{copy.teacher.intro}</p>
          </PageHeader>
          {quizzes.length === 0 ? (
            <p className="card empty-state">{copy.teacher.empty}</p>
          ) : (
            <ul className="card-list" aria-label={copy.teacher.title}>
              {quizzes.map((quiz) => (
                <li key={quiz.id} className="card quiz-card">
                  <div className="quiz-card__heading">
                    <h2>{quiz.title}</h2>
                    <span
                      className={`badge badge--${quiz.status === "PUBLISHED" ? "open" : "draft"}`}
                    >
                      {copy.quiz.status[quiz.status]}
                    </span>
                  </div>
                  <dl className="facts">
                    <div>
                      <dt>{copy.quiz.code}</dt>
                      <dd dir="ltr">{quiz.code}</dd>
                    </div>
                    <div>
                      <dt>{copy.quiz.classes}</dt>
                      <dd>{formatList(quiz.classNames, locale)}</dd>
                    </div>
                    {quiz.opensAt && quiz.closesAt ? (
                      <>
                        <div>
                          <dt>{copy.quiz.opens}</dt>
                          <dd>{formatDateTime(quiz.opensAt, locale)}</dd>
                        </div>
                        <div>
                          <dt>{copy.quiz.closes}</dt>
                          <dd>{formatDateTime(quiz.closesAt, locale)}</dd>
                        </div>
                      </>
                    ) : (
                      <div>
                        <dt>{copy.quiz.window}</dt>
                        <dd>{copy.quiz.noWindow}</dd>
                      </div>
                    )}
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
                    <div>
                      <dt>{copy.teacher.finished}</dt>
                      <dd>{quiz.finishedAttempts}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </SiteShell>
  );
}
