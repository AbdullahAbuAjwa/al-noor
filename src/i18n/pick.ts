// Looks up a message for a query-string code, ignoring anything unrecognized.
export function pickMessage<T extends Record<string, string>>(
  table: T,
  code: unknown,
): string | null {
  return typeof code === "string" && Object.hasOwn(table, code)
    ? table[code as keyof T]
    : null;
}
