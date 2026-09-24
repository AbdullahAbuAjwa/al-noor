import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { getLocale } from "@/i18n/locale";
import { messages } from "@/i18n/messages";
import { getCurrentUser } from "@/server/auth/current-user";
import { homePathFor } from "@/server/auth/paths";

export default async function NotFound() {
  const locale = await getLocale();
  const user = await getCurrentUser();
  const copy = messages[locale].notFound;

  return (
    <SiteShell locale={locale} currentPath="/" user={user}>
      <main id="main-content" className="page page--centered">
        <div className="container">
          <section className="card auth-card" aria-labelledby="not-found-title">
            <h1 id="not-found-title">{copy.title}</h1>
            <p className="muted">{copy.body}</p>
            <Link
              className="button button--quiet"
              href={user ? homePathFor(user.role) : "/"}
            >
              {copy.back}
            </Link>
          </section>
        </div>
      </main>
    </SiteShell>
  );
}
