import Image from "next/image";
import { SiteShell } from "@/components/site-shell";
import { getLocale } from "@/i18n/locale";
import { messages } from "@/i18n/messages";

export default async function HomePage() {
  const locale = await getLocale();
  const copy = messages[locale];

  return (
    <SiteShell locale={locale}>
      <main id="main-content" className="hero">
        <div className="container hero__inner">
          <section className="hero__copy" aria-labelledby="welcome-title">
            <p className="hero__eyebrow">{copy.phase}</p>
            <h1 id="welcome-title">{copy.status}</h1>
            <p className="hero__introduction">{copy.introduction}</p>
            <p className="hero__note">{copy.nextStep}</p>
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
