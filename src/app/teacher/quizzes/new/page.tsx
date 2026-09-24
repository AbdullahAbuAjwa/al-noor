import Link from "next/link";
import { DraftSettingsForm } from "@/components/draft-settings-form";
import { PageHeader } from "@/components/page-header";
import { SiteShell } from "@/components/site-shell";
import { getLocale } from "@/i18n/locale";
import { messages } from "@/i18n/messages";
import { pickMessage } from "@/i18n/pick";
import { requireRole } from "@/server/auth/current-user";
import { getDatabase } from "@/server/db";
import { listTaughtClasses } from "@/server/quizzes/drafts";

export default async function NewQuizPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireRole("TEACHER", "/teacher/quizzes/new");
  const locale = await getLocale();
  const copy = messages[locale];
  const params = await searchParams;
  const classes = await listTaughtClasses(await getDatabase(), user.id);
  const error = pickMessage(copy.authoring.errors, params.error);

  return (
    <SiteShell locale={locale} currentPath="/teacher/quizzes/new" user={user}>
      <main id="main-content" className="page">
        <div className="container container--narrow">
          <PageHeader
            eyebrow={copy.teacher.eyebrow}
            title={copy.authoring.newTitle}
          >
            <p className="muted">{copy.authoring.newIntro}</p>
          </PageHeader>
          {error ? (
            <p className="notice notice--error" role="alert">
              {error}
            </p>
          ) : null}
          {classes.length === 0 ? (
            <p className="card empty-state">{copy.authoring.noClasses}</p>
          ) : (
            <section className="card">
              <DraftSettingsForm
                locale={locale}
                action="/api/teacher/quizzes"
                classes={classes}
                submitLabel={copy.authoring.create}
              />
            </section>
          )}
          <p className="back-link">
            <Link href="/teacher">{copy.authoring.back}</Link>
          </p>
        </div>
      </main>
    </SiteShell>
  );
}
