import "server-only";

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export const LOCAL_DATABASE_URL = "postgres://startupfans:startupfans@localhost:5433/startupfans";

const globalForDatabase: typeof globalThis & {
  startupfansPostgres?: ReturnType<typeof postgres>;
  startupfansDatabase?: PostgresJsDatabase<typeof schema>;
} = globalThis;

function getDatabase() {
  if (!globalForDatabase.startupfansDatabase) {
    const url = process.env.DATABASE_URL ?? LOCAL_DATABASE_URL;
    globalForDatabase.startupfansPostgres ??= postgres(url, { prepare: false });
    globalForDatabase.startupfansDatabase = drizzle(globalForDatabase.startupfansPostgres, { schema });
  }
  return globalForDatabase.startupfansDatabase;
}

// The mock supplies the typed proxy target without creating a connection at import time.
// Any property access calls getDatabase(); the connection opens only when queried.
export const db: PostgresJsDatabase<typeof schema> = new Proxy(drizzle.mock({ schema }), {
  get(_target, property) {
    const database = getDatabase();
    const value: unknown = Reflect.get(database, property, database);
    return typeof value === "function" ? value.bind(database) : value;
  },
});
