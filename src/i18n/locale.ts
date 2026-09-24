import { cookies } from "next/headers";

export const localeCookieName = "al_noor_locale";
export const defaultLocale = "ar";
export type Locale = "ar" | "en";

export function isLocale(value: unknown): value is Locale {
  return value === "ar" || value === "en";
}

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(localeCookieName)?.value;
  return isLocale(value) ? value : defaultLocale;
}
