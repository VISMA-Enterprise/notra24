import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { eq, ilike, or, sql, and, desc } from "drizzle-orm";
import { authenticateRequest, unauthorized } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { success, created, error, paginated, serverError } from "@/lib/response";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) return unauthorized();

  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "25")));
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status");
    const bundle = url.searchParams.get("bundle");
    const language = url.searchParams.get("language");
    const offset = (page - 1) * limit;

    const conditions = [];
    if (search) {
      conditions.push(
        or(
          ilike(customers.firstName, `%${search}%`),
          ilike(customers.lastName, `%${search}%`),
          ilike(customers.phoneMobile, `%${search}%`),
          ilike(customers.deviceIdHub, `%${search}%`),
          ilike(customers.deviceIdMobile, `%${search}%`)
        )
      );
    }
    if (status) conditions.push(eq(customers.status, status as any));
    if (bundle) conditions.push(eq(customers.bundle, bundle as any));
    if (language) conditions.push(eq(customers.language, language as any));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, [{ count }]] = await Promise.all([
      db
        .select()
        .from(customers)
        .where(where)
        .orderBy(desc(customers.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(customers)
        .where(where),
    ]);

    return paginated(data, count, page, limit);
  } catch (err) {
    console.error("[CUSTOMERS] List error:", err);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) return unauthorized();

  try {
    const body = await req.json();
    const {
      firstName, lastName, birthYear, phoneHome, phoneMobile,
      address, floor, apartment, district, city, language,
      bundle, medicalNotes, deviceIdHub, deviceIdMobile,
      monthlyFee, contractStart, notes,
    } = body;

    if (!firstName || !lastName || !phoneMobile || !address || !bundle) {
      return error("firstName, lastName, phoneMobile, address, and bundle are required");
    }

    const [customer] = await db
      .insert(customers)
      .values({
        firstName, lastName, birthYear, phoneHome, phoneMobile,
        address, floor, apartment, district,
        city: city || "Antalya",
        language: language || "de",
        bundle,
        medicalNotes, deviceIdHub, deviceIdMobile,
        monthlyFee: monthlyFee?.toString(),
        contractStart, notes,
      })
      .returning();

    await logAudit({
      operator: auth,
      action: "customer_created",
      entityType: "customer",
      entityId: customer.id,
      details: { firstName, lastName },
    });

    return created(customer);
  } catch (err) {
    console.error("[CUSTOMERS] Create error:", err);
    return serverError();
  }
}
