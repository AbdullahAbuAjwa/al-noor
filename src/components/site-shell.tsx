import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Locale } from "@/i18n/locale";
import { messages } from "@/i18n/messages";
import { LanguageSwitch } from "./language-switch";

export function SiteShell({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const copy = messages[locale];

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        {copy.skipToContent}
      </a>
      <header className="site-header">
        <div className="container site-header__inner">
          <Link className="brand" href="/" aria-label={copy.name}>
            <Image src="/brand-mark.svg" alt="" width={48} height={48} priority />
            <span className="brand__copy">
              <strong>{copy.name}</strong>
              <small>{copy.brandLine}</small>
            </span>
          </Link>
          <LanguageSwitch locale={locale} />
        </div>
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
