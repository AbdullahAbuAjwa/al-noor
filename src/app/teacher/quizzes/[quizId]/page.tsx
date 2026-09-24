import Link from "next/link";
import { notFound } from "next/navigation";
import { DraftSettingsForm } from "@/components/draft-settings-form";
import { PageHeader } from "@/components/page-header";
import { SiteShell } from "@/components/site-shell";
import {
  formatDateTime,
  formatList,
  formatPercentFromBps,
} from "@/i18n/format";
import { getLocale } from "@/i18n/locale";
import { messages } from "@/i18n/messages";
import { pickMessage } from "@/i18n/pick";
import { requireRole } from "@/server/auth/current-user";
import { getDatabase } from "@/server/db";
import { getTeacherQuiz, listTaughtClasses } from "@/server/quizzes/drafts";

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
          <p className="back-link">
            <Link href="/teacher">{copy.authoring.back}</Link>
          </p>
        </div>
      </main>
    </SiteShell>
  );
}
