/**
 * Production bootstrap — creates organization + master admin only.
 * No demo managers, employees, or attendance records.
 *
 * Required env:
 *   DATABASE_URL
 *   MASTER_ADMIN_PHONE
 *   MASTER_ADMIN_PASSWORD
 *
 * Optional env:
 *   ORGANIZATION_NAME (default: Zrutam Attendance)
 *   MASTER_ADMIN_NAME (default: Master Admin)
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import * as schema from "../src/lib/db/schema.ts";
import { organizations, users } from "../src/lib/db/schema.js";

function normalizePhone(phone) {
  return String(phone).replace(/\D/g, "");
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

async function bootstrap() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  const phone = normalizePhone(requireEnv("MASTER_ADMIN_PHONE"));
  const password = requireEnv("MASTER_ADMIN_PASSWORD");
  const orgName = process.env.ORGANIZATION_NAME?.trim() || "Zrutam Attendance";
  const adminName = process.env.MASTER_ADMIN_NAME?.trim() || "Master Admin";

  if (phone.length < 10) {
    console.error("MASTER_ADMIN_PHONE must be a valid phone number (at least 10 digits).");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("MASTER_ADMIN_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL.replace(/[&?]channel_binding=require/g, ""));
  const db = drizzle(sql, { schema });

  console.log("Bootstrapping production database...\n");

  let [org] = await db.select().from(organizations).limit(1);

  if (!org) {
    [org] = await db.insert(organizations).values({ name: orgName }).returning();
    console.log(`Created organization: ${org.name}`);
  } else {
    console.log(`Using existing organization: ${org.name}`);
  }

  const [existingAdmin] = await db
    .select()
    .from(users)
    .where(and(eq(users.organizationId, org.id), eq(users.role, "master_admin")))
    .limit(1);

  if (existingAdmin) {
    console.log("\nMaster admin already exists — nothing to create.");
    console.log(`  Name:  ${existingAdmin.name}`);
    console.log(`  Phone: ${existingAdmin.phone ?? "(not set)"}`);
    console.log(`  Email: ${existingAdmin.email ?? "(not set)"}`);
    console.log("\nTo reset credentials, update the user directly in your database.");
    return;
  }

  const [existingPhone] = await db
    .select()
    .from(users)
    .where(and(eq(users.organizationId, org.id), eq(users.phone, phone)))
    .limit(1);

  if (existingPhone) {
    console.error(
      `\nA user with phone ${phone} already exists but is not master_admin. Fix manually before bootstrapping.`
    );
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [admin] = await db
    .insert(users)
    .values({
      organizationId: org.id,
      phone,
      passwordHash,
      name: adminName,
      role: "master_admin",
      status: "active",
    })
    .returning();

  console.log("\nProduction bootstrap complete.\n");
  console.log(`  Organization: ${org.name}`);
  console.log(`  Master Admin: ${admin.name}`);
  console.log(`  Login phone:  ${phone}`);
  console.log("\nManagers and employees can be added from the app after login.");
}

bootstrap()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
