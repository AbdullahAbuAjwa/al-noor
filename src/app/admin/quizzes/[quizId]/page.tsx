import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ResultsTable } from "@/components/results-table";
import { SiteShell } from "@/components/site-shell";
import { formatList } from "@/i18n/format";
import { getLocale } from "@/i18n/locale";
import { messages } from "@/i18n/messages";
import { requireRole } from "@/server/auth/current-user";
import { getDatabase } from "@/server/db";
import { getQuizResults } from "@/server/results/results";

export default async function AdminQuizResultsPage({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = await params;
  const path = `/admin/quizzes/${encodeURIComponent(quizId)}`;
  const user = await requireRole("ADMIN", path);
  // Centre-wide: the administrator sees every published quiz's results.
  const results = await getQuizResults(await getDatabase(), quizId, new Date());
  if (!results) notFound();
  const locale = await getLocale();
  const copy = messages[locale];

  return (
    <SiteShell locale={locale} currentPath={path} user={user}>
      <main id="main-content" className="page">
        <div className="container">
          <PageHeader eyebrow={copy.admin.eyebrow} title={results.title}>
            <p className="muted">
              {results.teacherName} · {formatList(results.classNames, locale)}
            </p>
          </PageHeader>
          <ResultsTable locale={locale} results={results} />
          <p className="back-link">
            <Link href="/admin">{copy.nav.ADMIN}</Link>
          </p>
        </div>
      </main>
    </SiteShell>
  );
}
