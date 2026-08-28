import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import bcrypt from "bcryptjs";
import * as schema from "../src/lib/db/schema.ts";
import {
  organizations,
  users,
  employees,
  attendanceRecords,
} from "../src/lib/db/schema.js";

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required. Copy .env.example to .env.local");
    process.exit(1);
  }

  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEV_SEED !== "true") {
    console.error(
      "Refusing to run demo seed in production.\n" +
        "Use schema push + production bootstrap instead:\n" +
        "  npm run db:push\n" +
        "  npm run db:bootstrap"
    );
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL.replace(/[&?]channel_binding=require/g, ""));
  const db = drizzle(sql, { schema });

  console.log("Seeding database...");

  const [org] = await db
    .insert(organizations)
    .values({ name: "Zrutam Attendance" })
    .returning();

  const adminHash = await bcrypt.hash("admin123", 10);
  const managerHash = await bcrypt.hash("manager123", 10);

  const [admin] = await db
    .insert(users)
    .values({
      organizationId: org.id,
      email: "admin@example.com",
      passwordHash: adminHash,
      name: "Master Admin",
      role: "master_admin",
      status: "active",
    })
    .returning();

  const [managerA] = await db
    .insert(users)
    .values({
      organizationId: org.id,
      phone: "9876543210",
      passwordHash: managerHash,
      name: "Manager Ravi",
      role: "manager",
      status: "active",
    })
    .returning();

  const [managerB] = await db
    .insert(users)
    .values({
      organizationId: org.id,
      phone: "9876543211",
      passwordHash: managerHash,
      name: "Manager Priya",
      role: "manager",
      status: "active",
    })
    .returning();

  const sampleEmployees = [
    { name: "Rahul Das", managerId: managerA.id, joiningDate: "2024-01-15" },
    { name: "Amit Shah", managerId: managerA.id, joiningDate: "2024-03-01" },
    { name: "Suman Roy", managerId: managerA.id, joiningDate: "2024-06-10" },
    { name: "Priya Nair", managerId: managerB.id, joiningDate: "2024-02-20" },
    { name: "Vikram Singh", managerId: managerB.id, joiningDate: "2024-04-05" },
    { name: "Anita Patel", managerId: admin.id, joiningDate: "2024-01-01" },
  ];

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  for (const emp of sampleEmployees) {
    const [employee] = await db
      .insert(employees)
      .values({
        organizationId: org.id,
        name: emp.name,
        joiningDate: emp.joiningDate,
        currentManagerId: emp.managerId,
      })
      .returning();

    const statuses = ["P", "P", "A", "L", "H", "P"];
    for (let d = 1; d <= Math.min(day, 10); d++) {
      await db.insert(attendanceRecords).values({
        organizationId: org.id,
        employeeId: employee.id,
        date: `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        status: statuses[d % statuses.length],
      });
    }
  }

  console.log("\nSeed complete!\n");
  console.log("Demo accounts:");
  console.log("  Master Admin: admin@example.com / admin123");
  console.log("  Manager A:    9876543210 / manager123");
  console.log("  Manager B:    9876543211 / manager123");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
