import type { Locale } from "@/i18n/locale";
import { messages } from "@/i18n/messages";

export function LanguageSwitch({
  locale,
  returnTo,
}: {
  locale: Locale;
  returnTo: string;
}) {
  const nextLocale = locale === "ar" ? "en" : "ar";

  return (
    <form action="/api/locale" method="post" className="language-switch">
      <input type="hidden" name="returnTo" value={returnTo} />
      <button
        type="submit"
        name="locale"
        value={nextLocale}
        className="language-switch__button"
      >
        <svg
          className="language-switch__icon"
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.4 2.5 3.6 5.5 3.6 9S14.4 18.5 12 21M12 3c-2.4 2.5-3.6 5.5-3.6 9S9.6 18.5 12 21" />
        </svg>
        <span className="visually-hidden">
          {messages[locale].switchLanguagePrefix}
        </span>
        <span lang={nextLocale} dir={nextLocale === "ar" ? "rtl" : "ltr"}>
          {nextLocale === "ar" ? "العربية" : "English"}
        </span>
      </button>
    </form>
  );
}
