import "server-only";

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDatabase: typeof globalThis & {
  startupfansPostgres?: ReturnType<typeof postgres>;
  startupfansDatabase?: PostgresJsDatabase<typeof schema>;
} = globalThis;

function getDatabase() {
  if (!globalForDatabase.startupfansDatabase) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is required to query the database. Set it in your server environment.");
    }
    globalForDatabase.startupfansPostgres ??= postgres(url, { prepare: false });
    globalForDatabase.startupfansDatabase = drizzle(globalForDatabase.startupfansPostgres, { schema });
  }
  return globalForDatabase.startupfansDatabase;
}

// The mock supplies the typed proxy target without creating a connection at import time.
// Any property access calls getDatabase(); do not inspect db without DATABASE_URL set.
export const db: PostgresJsDatabase<typeof schema> = new Proxy(drizzle.mock({ schema }), {
  get(_target, property) {
    const database = getDatabase();
    const value: unknown = Reflect.get(database, property, database);
    return typeof value === "function" ? value.bind(database) : value;
  },
});
