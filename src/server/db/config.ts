import { resolve } from "node:path";

export function getDatabaseUrl(value = process.env.DATABASE_URL): string {
  const url = value ?? "file:./.data/al-noor.db";
  if (!url.startsWith("file:") || url.slice(5).trim() === "" || /[?#]/.test(url)) {
    throw new Error("DATABASE_URL must be a file: path without query parameters or fragments.");
  }
  // Prisma CLI and the application must resolve relative paths from the same root.
  return `file:${resolve(url.slice(5))}`;
}
