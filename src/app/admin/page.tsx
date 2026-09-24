import { PageHeader } from "@/components/page-header";
import { SiteShell } from "@/components/site-shell";
import { getLocale } from "@/i18n/locale";
import { messages } from "@/i18n/messages";
import { requireRole } from "@/server/auth/current-user";
import Link from "next/link";
import { formatList } from "@/i18n/format";
import { getCenterOverview } from "@/server/dashboard/queries";
import { listPublishedQuizzes } from "@/server/results/results";
import { getDatabase } from "@/server/db";

export default async function AdminHomePage() {
  const user = await requireRole("ADMIN", "/admin");
  const locale = await getLocale();
  const copy = messages[locale].admin;
  const db = await getDatabase();
  const overview = await getCenterOverview(db);
  const quizzes = await listPublishedQuizzes(db);
  const results = messages[locale].results;
  const stats = [
    [copy.students, overview.students],
    [copy.teachers, overview.teachers],
    [copy.published, overview.publishedQuizzes],
    [copy.drafts, overview.draftQuizzes],
    [copy.finished, overview.finishedAttempts],
  ] as const;

  return (
    <SiteShell locale={locale} currentPath="/admin" user={user}>
      <main id="main-content" className="page">
        <div className="container">
          <PageHeader eyebrow={copy.eyebrow} title={copy.title}>
            <p className="muted">{copy.intro}</p>
          </PageHeader>
          <dl className="stat-grid">
            {stats.map(([label, value]) => (
              <div key={label} className="card stat">
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <section className="card" aria-labelledby="quizzes-title">
            <h2 id="quizzes-title">{results.quizzesTitle}</h2>
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">{results.quiz}</th>
                    <th scope="col">{results.teacher}</th>
                    <th scope="col">{results.classes}</th>
                    <th scope="col">{results.finished}</th>
                  </tr>
                </thead>
                <tbody>
                  {quizzes.map((quiz) => (
                    <tr key={quiz.id}>
                      <th scope="row">
                        <Link href={`/admin/quizzes/${quiz.id}`}>{quiz.title}</Link>
                      </th>
                      <td>{quiz.teacher.name}</td>
                      <td>
                        {formatList(
                          quiz.classes.map((entry) => entry.class.name).sort(),
                          locale,
                        )}
                      </td>
                      <td>{quiz._count.attempts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="card" aria-labelledby="classes-title">
            <h2 id="classes-title">{copy.byClass}</h2>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">{copy.className}</th>
                  <th scope="col">{copy.studentCount}</th>
                </tr>
              </thead>
              <tbody>
                {overview.classes.map((entry) => (
                  <tr key={entry.name}>
                    <th scope="row">{entry.name}</th>
                    <td>{entry.students}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </main>
    </SiteShell>
  );
}
