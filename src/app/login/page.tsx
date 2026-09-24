import { redirect } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { getLocale } from "@/i18n/locale";
import { messages } from "@/i18n/messages";
import { getCurrentUser } from "@/server/auth/current-user";
import { homePathFor, safeLocalPath } from "@/server/auth/paths";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(homePathFor(user.role));

  const params = await searchParams;
  const locale = await getLocale();
  const copy = messages[locale].login;
  const next = safeLocalPath(params.next);
  const error =
    params.error === "throttled"
      ? copy.throttled
      : params.error === "invalid"
        ? copy.invalid
        : null;

  return (
    <SiteShell locale={locale} currentPath="/login">
      <main id="main-content" className="page page--centered">
        <div className="container">
          <section className="card auth-card" aria-labelledby="login-title">
            <h1 id="login-title">{copy.title}</h1>
            <p className="muted">{copy.intro}</p>
            {error ? (
              <p className="notice notice--error" role="alert">
                {error}
              </p>
            ) : params.signedOut ? (
              <p className="notice notice--info" role="status">
                {copy.signedOut}
              </p>
            ) : null}
            <form action="/api/auth/login" method="post" className="form">
              {next ? <input type="hidden" name="next" value={next} /> : null}
              <div className="field">
                <label htmlFor="username">{copy.username}</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  dir="ltr"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={64}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="password">{copy.password}</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  dir="ltr"
                  autoComplete="current-password"
                  maxLength={128}
                  required
                />
              </div>
              <button type="submit" className="button button--primary">
                {copy.submit}
              </button>
            </form>
            <p className="muted small">{copy.sessionNote}</p>
          </section>
        </div>
      </main>
    </SiteShell>
  );
}
