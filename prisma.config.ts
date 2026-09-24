import { defineConfig } from "prisma/config";
import { getDatabaseUrl } from "./src/server/db/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: getDatabaseUrl() },
});
