import type { createDatabaseClient } from "./client";

export type Database = Awaited<ReturnType<typeof createDatabaseClient>>;
