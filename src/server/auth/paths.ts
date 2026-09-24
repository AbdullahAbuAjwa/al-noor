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
