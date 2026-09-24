import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Locale } from "@/i18n/locale";
import { messages } from "@/i18n/messages";
import type { SessionUser } from "@/server/auth/session";
import { homePathFor } from "@/server/auth/paths";
import { LanguageSwitch } from "./language-switch";

export function SiteShell({
  locale,
  currentPath,
  user = null,
  children,
}: {
  locale: Locale;
  currentPath: string;
  user?: SessionUser | null;
  children: ReactNode;
}) {
  const copy = messages[locale];
  const home = user ? homePathFor(user.role) : "/";

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        {copy.skipToContent}
      </a>
      <header className="site-header">
        <div className="container site-header__inner">
          <Link className="brand" href={home} aria-label={copy.name}>
            <Image
              src="/brand-mark.svg"
              alt=""
              width={48}
              height={48}
              priority
            />
            <span className="brand__copy">
              <strong>{copy.name}</strong>
              <small>{copy.brandLine}</small>
            </span>
          </Link>
          <LanguageSwitch locale={locale} returnTo={currentPath} />
        </div>
        {user ? (
          <div className="account-bar">
            <div className="container account-bar__inner">
              <p className="account-bar__identity">
                <span className="account-bar__name">{user.name}</span>
                <span className="badge badge--soft">
                  {copy.roles[user.role]}
                </span>
              </p>
              <nav className="account-bar__nav" aria-label={copy.nav.label}>
                <Link
                  href={home}
                  aria-current={currentPath === home ? "page" : undefined}
                  className="nav-link"
                >
                  {copy.nav[user.role]}
                </Link>
                <form action="/api/auth/logout" method="post">
                  <button type="submit" className="button button--quiet">
                    {copy.nav.signOut}
                  </button>
                </form>
              </nav>
            </div>
          </div>
        ) : null}
      </header>
      {children}
      <footer className="site-footer">
        <div className="container site-footer__inner">
          <span>{copy.name}</span>
          <span>{copy.footerLine}</span>
        </div>
      </footer>
    </div>
  );
}
