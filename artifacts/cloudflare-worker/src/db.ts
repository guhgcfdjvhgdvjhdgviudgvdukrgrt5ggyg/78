import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let db: ReturnType<typeof drizzle> | null = null;

export function getDb(env: { DATABASE_URL: string }) {
  if (!db) {
    const sql = neon(env.DATABASE_URL);
    db = drizzle(sql, { schema });
  }
  return db;
}
