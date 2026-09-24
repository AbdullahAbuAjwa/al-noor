import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { createDatabaseClient } from "../../src/server/db/client";
import { seedDemoData } from "../../src/server/demo/seed";
import type { Database } from "../../src/server/db/types";

// Applies the real migrations and demo seed once, then gives every test its own
// copy of that SQLite file so tests cannot affect each other.
export function seededDatabaseFixture(seededAt: Date) {
  const root = mkdtempSync(join(tmpdir(), "al-noor-seeded-"));
  const template = join(root, "template.db");
  let directory = "";

  return {
    async setup() {
      execFileSync(
        process.execPath,
        ["--import", "tsx", "scripts/migrate.ts"],
        {
          env: { ...process.env, DATABASE_URL: `file:${template}` },
          stdio: "pipe",
        },
      );
      const db = await createDatabaseClient(`file:${template}`);
      await seedDemoData(db, seededAt);
      await db.$queryRawUnsafe("PRAGMA wal_checkpoint(TRUNCATE)");
      await db.$disconnect();
    },
    async open(): Promise<Database> {
      directory = mkdtempSync(join(root, "case-"));
      const file = join(directory, "test.db");
      copyFileSync(template, file);
      return createDatabaseClient(`file:${file}`);
    },
    // A second, independent connection to the current test's file, for
    // exercising simultaneous requests the way two server requests would.
    async connectAgain(): Promise<Database> {
      return createDatabaseClient(`file:${join(directory, "test.db")}`);
    },
    async close(db: Database | undefined) {
      await db?.$disconnect();
      if (directory) rmSync(directory, { recursive: true, force: true });
    },
    cleanup() {
      rmSync(root, { recursive: true, force: true });
    },
  };
}
