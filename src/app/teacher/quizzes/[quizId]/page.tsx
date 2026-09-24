import Link from "next/link";
import { notFound } from "next/navigation";
import { DraftSettingsForm } from "@/components/draft-settings-form";
import { QuestionForm } from "@/components/question-form";
import { PageHeader } from "@/components/page-header";
import { SiteShell } from "@/components/site-shell";
import {
  formatDateTime,
  formatHundredths,
  formatList,
  formatPercentFromBps,
} from "@/i18n/format";
import { getLocale } from "@/i18n/locale";
import { messages } from "@/i18n/messages";
import { pickMessage } from "@/i18n/pick";
import { requireRole } from "@/server/auth/current-user";
import { getDatabase } from "@/server/db";
import { getTeacherQuiz, listTaughtClasses } from "@/server/quizzes/drafts";
import { listQuizQuestions } from "@/server/quizzes/questions";

export default async function TeacherQuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ quizId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { quizId } = await params;
  const path = `/teacher/quizzes/${encodeURIComponent(quizId)}`;
  const user = await requireRole("TEACHER", path);
  const db = await getDatabase();
  // Another teacher's quiz is indistinguishable from a missing one.
  const quiz = await getTeacherQuiz(db, user.id, quizId);
  if (!quiz) notFound();

  const locale = await getLocale();
  const copy = messages[locale];
  const query = await searchParams;
  const error = pickMessage(copy.authoring.errors, query.error);
  const notice = pickMessage(copy.authoring.notices, query.notice);
  const isDraft = quiz.status === "DRAFT";
  const classes = isDraft ? await listTaughtClasses(db, user.id) : [];
  // Ownership was confirmed above; the owner may see the correct answers.
  const questions = await listQuizQuestions(db, quiz.id);
  const questionsAction = `/api/teacher/quizzes/${encodeURIComponent(quiz.id)}/questions`;

  return (
    <SiteShell locale={locale} currentPath={path} user={user}>
      <main id="main-content" className="page">
        <div className="container container--narrow">
          <PageHeader
            eyebrow={
              isDraft
                ? copy.authoring.draftEyebrow
                : copy.authoring.publishedEyebrow
            }
            title={quiz.title}
          />
          {error ? (
            <p className="notice notice--error" role="alert">
              {error}
            </p>
          ) : notice ? (
            <p className="notice notice--info" role="status">
              {notice}
            </p>
          ) : null}
          <section className="card" aria-labelledby="settings-title">
            <h2 id="settings-title">{copy.authoring.settingsTitle}</h2>
            <dl className="facts">
              <div>
                <dt>{copy.quiz.code}</dt>
                <dd dir="ltr">{quiz.code}</dd>
              </div>
              <div>
                <dt>{copy.quiz.questions}</dt>
                <dd>{quiz.questionCount}</dd>
              </div>
              {!isDraft ? (
                <>
                  <div>
                    <dt>{copy.quiz.classes}</dt>
                    <dd>
                      {formatList(
                        quiz.classes.map((entry) => entry.name),
                        locale,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>{copy.quiz.duration}</dt>
                    <dd>{copy.quiz.minutes(quiz.durationMinutes)}</dd>
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
                  ) : null}
                </>
              ) : null}
            </dl>
            {isDraft ? (
              <DraftSettingsForm
                locale={locale}
                action={`/api/teacher/quizzes/${encodeURIComponent(quiz.id)}/settings`}
                classes={classes}
                values={{
                  title: quiz.title,
                  classIds: quiz.classes.map((entry) => entry.id),
                  durationMinutes: quiz.durationMinutes,
                  penaltyBps: quiz.penaltyBps,
                }}
                submitLabel={copy.authoring.save}
              />
            ) : (
              <p className="muted">{copy.authoring.lockedNote}</p>
            )}
          </section>
          <section className="card" id="questions" aria-labelledby="questions-title">
            <h2 id="questions-title">
              {copy.questions.title} ({questions.length})
            </h2>
            {questions.length === 0 ? (
              <p className="muted">{copy.questions.empty}</p>
            ) : (
              <ol className="question-list">
                {questions.map((question) => (
                  <li
                    key={question.id}
                    id={`question-${question.id}`}
                    className="question"
                  >
                    <div className="question__heading">
                      <h3>{copy.questions.number(question.position)}</h3>
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
                      {question.options.map((option) => {
                        const correct =
                          option.position === question.correctOptionPosition;
                        return (
                          <li
                            key={option.position}
                            className={correct ? "option option--correct" : "option"}
                          >
                            <span dir="auto">{option.text}</span>
                            {correct ? (
                              <span className="badge badge--done">
                                {copy.questions.correct}
                              </span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                    {isDraft ? (
                      <details className="question__edit">
                        <summary>{copy.questions.edit}</summary>
                        <QuestionForm
                          locale={locale}
                          action={`${questionsAction}/${encodeURIComponent(question.id)}`}
                          idPrefix={`edit-${question.position}`}
                          values={{
                            text: question.text,
                            pointsHundredths: question.pointsHundredths,
                            options: question.options.map((option) => option.text),
                            correctPosition: question.correctOptionPosition,
                          }}
                          submitLabel={copy.questions.save}
                        />
                        <form
                          action={`${questionsAction}/${encodeURIComponent(question.id)}`}
                          method="post"
                          className="question__delete"
                        >
                          <input type="hidden" name="intent" value="delete" />
                          <button type="submit" className="button button--danger">
                            {copy.questions.delete}
                          </button>
                        </form>
                      </details>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </section>
          {isDraft ? (
            <section
              className="card"
              id="new-question"
              aria-labelledby="new-question-title"
            >
              <h2 id="new-question-title">{copy.questions.newTitle}</h2>
              <QuestionForm
                locale={locale}
                action={questionsAction}
                idPrefix="new-question"
                submitLabel={copy.questions.add}
              />
            </section>
          ) : null}
          <p className="back-link">
            <Link href="/teacher">{copy.authoring.back}</Link>
          </p>
        </div>
      </main>
    </SiteShell>
  );
}
