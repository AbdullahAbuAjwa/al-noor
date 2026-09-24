import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../../generated/prisma/client";
import { getDatabaseUrl } from "./config";

// This factory is also used by local CLI tools and isolated integration tests.
export async function createDatabaseClient(url = getDatabaseUrl()) {
  const client = new PrismaClient({
    adapter: new PrismaBetterSqlite3({
      url: getDatabaseUrl(url),
      timeout: 5_000,
    }),
  });

  try {
    await client.$executeRawUnsafe("PRAGMA foreign_keys = ON");
    await client.$queryRawUnsafe("PRAGMA journal_mode = WAL");
    return client;
  } catch (error) {
    await client.$disconnect();
    throw error;
  }
}
