import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/lib/env";
import * as schema from "./schema";

function createDb() {
  const client = postgres(env().DATABASE_URL, {
    max: env().DB_POOL_MAX,
    // Supabase Transaction pooler не підтримує prepared statements.
    prepare: false,
  });
  return drizzle(client, { schema });
}

type Db = ReturnType<typeof createDb>;

// Один пул на процес; у dev переживає hot reload.
const globalForDb = globalThis as unknown as { db?: Db };

export function db(): Db {
  globalForDb.db ??= createDb();
  return globalForDb.db;
}

export { schema };
