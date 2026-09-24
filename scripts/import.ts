import { createDatabaseClient } from "../src/server/db/client";
import { importKinds, type ImportKind } from "../src/server/imports/contract";
import { ImportError } from "../src/server/imports/error";
import { importFromFile } from "../src/server/imports/persist";

async function main() {
  const [kind, path, ...extra] = process.argv.slice(2);
  if (!importKinds.includes(kind as ImportKind) || !path || extra.length) {
    throw new ImportError(
      "Usage: npm run db:import -- teachers|students|quiz path/to/file.csv|xlsx",
    );
  }
  const db = await createDatabaseClient();
  try {
    const result = await importFromFile(db, kind as ImportKind, path);
    process.stdout.write(
      `Imported ${result.imported} ${kind === "quiz" ? "questions into a draft quiz" : kind}.\n`,
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof ImportError ? error.message : error);
  process.exitCode = 1;
});
