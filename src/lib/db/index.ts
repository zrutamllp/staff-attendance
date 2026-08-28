import { neon } from "@neondatabase/serverless";
import { drizzle, NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Add it to .env.local — see README.");
  }
  return url.replace(/[&?]channel_binding=require/g, "");
}

type Db = NeonHttpDatabase<typeof schema>;

let _db: Db | undefined;

export function getDb(): Db {
  if (!_db) {
    const sql = neon(getDatabaseUrl());
    _db = drizzle(sql, { schema });
  }
  return _db;
}

export const db = new Proxy({} as Db, {
  get(_, prop) {
    const instance = getDb();
    const value = instance[prop as keyof Db];
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(instance);
    }
    return value;
  },
});
