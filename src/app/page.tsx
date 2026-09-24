import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { getLocale } from "@/i18n/locale";
import { messages } from "@/i18n/messages";
import { getCurrentUser } from "@/server/auth/current-user";
import { homePathFor } from "@/server/auth/paths";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect(homePathFor(user.role));
  const locale = await getLocale();
  const copy = messages[locale];

  return (
    <SiteShell locale={locale} currentPath="/">
      <main id="main-content" className="hero">
        <div className="container hero__inner">
          <section className="hero__copy" aria-labelledby="welcome-title">
            <p className="hero__eyebrow">{copy.landing.eyebrow}</p>
            <h1 id="welcome-title">{copy.landing.title}</h1>
            <p className="hero__introduction">{copy.landing.introduction}</p>
            <p className="hero__note">{copy.landing.note}</p>
            <Link className="button button--primary hero__cta" href="/login">
              {copy.landing.cta}
            </Link>
          </section>
          <div className="hero__visual" aria-hidden="true">
            <div className="hero__orbit hero__orbit--outer" />
            <div className="hero__orbit hero__orbit--inner" />
            <div className="hero__mark">
              <Image src="/brand-mark.svg" alt="" width={124} height={124} />
            </div>
            <span className="hero__spark hero__spark--one" />
            <span className="hero__spark hero__spark--two" />
          </div>
        </div>
      </main>
    </SiteShell>
  );
}
