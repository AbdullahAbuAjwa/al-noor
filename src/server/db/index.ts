import "server-only";
import { createDatabaseClient } from "./client";

const databaseGlobal = globalThis as typeof globalThis & {
  alNoorDatabase?: ReturnType<typeof createDatabaseClient>;
};

export function getDatabase() {
  databaseGlobal.alNoorDatabase ??= createDatabaseClient().catch((error) => {
    databaseGlobal.alNoorDatabase = undefined;
    throw error;
  });
  return databaseGlobal.alNoorDatabase;
}
