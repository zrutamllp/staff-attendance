import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/lib/db/schema.js";
import { organizations } from "../src/lib/db/schema.js";

const url = process.env.DATABASE_URL?.replace(/[&?]channel_binding=require/g, "");

if (!url) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const sql = neon(url);
const db = drizzle(sql, { schema });

try {
  const rows = await db.select().from(organizations).limit(1);
  console.log("Connection OK — orgs found:", rows.length);
} catch (err) {
  console.error("Connection failed:", err.message);
  process.exit(1);
}
