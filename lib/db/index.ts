import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let _db: NeonHttpDatabase<typeof schema> | null = null;

export function getDb(): NeonHttpDatabase<typeof schema> {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL is not set. Connect a Neon database in your Vercel project settings.",
      );
    }
    const sql = neon(url);
    _db = drizzle(sql, { schema });
  }
  return _db;
}
