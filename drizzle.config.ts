import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

export const config = defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "postgres://startupfans:startupfans@localhost:5433/startupfans" },
});

// drizzle-kit reads the default export; the named export satisfies the named-exports convention.
export { config as default };
