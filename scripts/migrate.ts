import { closeSync, mkdirSync, openSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { getDatabaseUrl } from "../src/server/db/config";

const url = getDatabaseUrl();
mkdirSync(dirname(url.slice(5)), { recursive: true });
// Prisma 7's deploy command needs an existing SQLite file in this setup.
// Append mode creates it on first use without truncating existing data.
closeSync(openSync(url.slice(5), "a", 0o600));

const result = spawnSync(
  process.execPath,
  [resolve("node_modules/prisma/build/index.js"), "migrate", "deploy"],
  { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
