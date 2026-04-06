import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { operators } from "./schema";

dotenv.config();

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL not set");

  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);

  console.log("Seeding admin operator...");
  const hash = await bcrypt.hash("notra2024!", 12);

  await db
    .insert(operators)
    .values({
      name: "Ismail Baysal",
      email: "admin@notra24.com",
      passwordHash: hash,
      phoneExtension: "101",
      language: "de",
      role: "admin",
      active: true,
    })
    .onConflictDoNothing();

  console.log("Seed completed.");
  await client.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
