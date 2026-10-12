import "server-only";

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let database: PostgresJsDatabase<typeof schema> | undefined;

function getDatabase() {
  if (!database) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is required to query the database. Set it in your server environment.");
    }
    database = drizzle(postgres(url), { schema });
  }
  return database;
}

// The mock supplies the typed proxy target without creating a connection at import time.
export const db: PostgresJsDatabase<typeof schema> = new Proxy(drizzle.mock({ schema }), {
  get(_target, property) {
    const database = getDatabase();
    const value: unknown = Reflect.get(database, property, database);
    return typeof value === "function" ? value.bind(database) : value;
  },
});
