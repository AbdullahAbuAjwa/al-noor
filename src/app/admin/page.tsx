import { PageHeader } from "@/components/page-header";
import { SiteShell } from "@/components/site-shell";
import { getLocale } from "@/i18n/locale";
import { messages } from "@/i18n/messages";
import { requireRole } from "@/server/auth/current-user";
import { getCenterOverview } from "@/server/dashboard/queries";
import { getDatabase } from "@/server/db";

export default async function AdminHomePage() {
  const user = await requireRole("ADMIN", "/admin");
  const locale = await getLocale();
  const copy = messages[locale].admin;
  const overview = await getCenterOverview(await getDatabase());
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
