import { createDatabaseClient } from "../src/server/db/client";
import { seedDemoData } from "../src/server/demo/seed";

async function main() {
  const db = await createDatabaseClient();
  try {
    const result = await seedDemoData(db);
    process.stdout.write(
      result === "created"
        ? "Demo data initialized.\n"
        : "Demo data already initialized; existing records preserved.\n",
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
