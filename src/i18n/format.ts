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

// Integer hundredths to a compact decimal string, e.g. 150 -> "1.5", 200 -> "2".
export function formatHundredths(value: number): string {
  return String(Number((value / 100).toFixed(2)));
}

// Basis points (hundredths of a percent) to a percentage, e.g. 2500 -> "25".
export function formatPercentFromBps(bps: number): string {
  return formatHundredths(bps);
}
