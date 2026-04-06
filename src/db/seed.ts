import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { operators, organizations } from "./schema";

dotenv.config();

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL not set");

  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);

  console.log("Creating Antalya organization...");
  const [antalyaOrg] = await db
    .insert(organizations)
    .values({
      name: "Notra 24 Antalya",
      slug: "antalya",
      city: "Antalya",
      country: "TR",
      timezone: "Europe/Istanbul",
      status: "active",
      contactEmail: "antalya@notra24.com",
      maxOperators: 10,
      maxCustomers: 500,
    })
    .onConflictDoNothing()
    .returning();

  const orgId = antalyaOrg?.id;
  console.log("Org ID:", orgId);

  console.log("Seeding super admin...");
  const superHash = await bcrypt.hash("notra2024!", 12);
  await db
    .insert(operators)
    .values({
      organizationId: null, // super admin — no org
      name: "Ismail Baysal",
      email: "admin@notra24.com",
      passwordHash: superHash,
      phoneExtension: "100",
      language: "de",
      role: "super_admin",
      active: true,
    })
    .onConflictDoNothing();

  if (orgId) {
    console.log("Seeding Antalya operator...");
    const opHash = await bcrypt.hash("antalya2024!", 12);
    await db
      .insert(operators)
      .values({
        organizationId: orgId,
        name: "Operator Antalya",
        email: "operator@antalya.notra24.com",
        passwordHash: opHash,
        phoneExtension: "101",
        language: "de",
        role: "admin",
        active: true,
      })
      .onConflictDoNothing();
  }

  console.log("Seed completed.");
  await client.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
