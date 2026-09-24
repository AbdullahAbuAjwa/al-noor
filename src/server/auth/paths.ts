import type { Role } from "../../generated/prisma/enums";

const homePaths: Record<Role, string> = {
  STUDENT: "/student",
  TEACHER: "/teacher",
  ADMIN: "/admin",
};

export function homePathFor(role: Role): string {
  return homePaths[role];
}

// Accept only same-site absolute paths, never "//host" or "/\host" forms that
// browsers can resolve to another origin.
export function safeLocalPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 512) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (/[\\\u0000-\u001F\u007F]/.test(value)) return null;
  return value;
}

// After login, honor a requested page only inside the account's own area.
export function postLoginPath(role: Role, requested: unknown): string {
  const home = homePathFor(role);
  const path = safeLocalPath(requested);
  if (!path) return home;
  const pathname = path.split(/[?#]/, 1)[0];
  return pathname === home || pathname.startsWith(`${home}/`) ? path : home;
}

export const loginErrors = ["invalid", "throttled"] as const;
export type LoginError = (typeof loginErrors)[number];

export function isLoginError(value: unknown): value is LoginError {
  return loginErrors.includes(value as LoginError);
}

// Rebuilds the sign-in URL from recognized values only, so switching language
// keeps the message and requested page without echoing arbitrary input.
export function loginPagePath(params: {
  error?: unknown;
  signedOut?: unknown;
  next?: unknown;
}): string {
  const query = new URLSearchParams();
  if (isLoginError(params.error)) query.set("error", params.error);
  else if (params.signedOut === "1") query.set("signedOut", "1");
  const next = safeLocalPath(params.next);
  if (next) query.set("next", next);
  const search = query.toString();
  return search ? `/login?${search}` : "/login";
}
