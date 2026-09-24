import Image from "next/image";
import { getLocale } from "@/i18n/locale";
import { messages } from "@/i18n/messages";

export default async function HomePage() {
  const locale = await getLocale();
  const copy = messages[locale];
  const otherLocale = locale === "ar" ? "en" : "ar";

  return (
    <main className="welcome">
      <section className="welcome-card" aria-labelledby="welcome-title">
        <Image src="/brand-mark.svg" alt="" width={64} height={64} priority />
        <p className="eyebrow">{copy.name}</p>
        <h1 id="welcome-title">{copy.status}</h1>
        <p className="introduction">{copy.introduction}</p>
        <form action="/api/locale" method="post" className="language-form">
          <button
            type="submit"
            name="locale"
            value={otherLocale}
            lang={otherLocale}
            dir={otherLocale === "ar" ? "rtl" : "ltr"}
            aria-label={copy.switchLanguage}
            className="language-button"
          >
            {otherLocale === "ar" ? "العربية" : "English"}
          </button>
        </form>
      </section>
    </main>
  );
}
