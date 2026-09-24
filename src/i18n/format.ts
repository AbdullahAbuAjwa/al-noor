import type { Locale } from "./locale";

// The centre operates in Amman; server-rendered times use that zone regardless
// of the container or browser clock. Latin digits match scores and usernames.
export const centerTimeZone = "Asia/Amman";

const dateTimeFormats: Record<Locale, Intl.DateTimeFormat> = {
  ar: new Intl.DateTimeFormat("ar-JO-u-nu-latn", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: centerTimeZone,
  }),
  en: new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: centerTimeZone,
  }),
};

export function formatDateTime(date: Date, locale: Locale): string {
  return dateTimeFormats[locale].format(date);
}

export function formatList(items: string[], locale: Locale): string {
  return items.join(locale === "ar" ? "، " : ", ");
}

// Basis points to a compact percentage string, e.g. 2500 -> "25", 1250 -> "12.5".
export function formatPercentFromBps(bps: number): string {
  return String(Number((bps / 100).toFixed(2)));
}
