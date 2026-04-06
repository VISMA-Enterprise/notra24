import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { eq, ilike, or, sql, and, desc } from "drizzle-orm";
import { authenticateRequest, unauthorized, forbidden, hasOrgAccess } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { success, created, error, paginated, serverError } from "@/lib/response";
import { getOrganizationFromHost } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) return unauthorized();

  try {
    const host = req.headers.get("host") || "";
    const { orgId, isSuperAdmin } = await getOrganizationFromHost(host);

    // Non-super-admin must access their own org
    if (!isSuperAdmin && !hasOrgAccess(auth, orgId)) return forbidden();

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "25")));
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status");
    const offset = (page - 1) * limit;

    const conditions = [];

    // Tenant isolation: filter by org unless super-admin
    if (!isSuperAdmin && orgId) {
      conditions.push(eq(customers.organizationId, orgId));
    } else if (isSuperAdmin && url.searchParams.get("orgId")) {
      conditions.push(eq(customers.organizationId, url.searchParams.get("orgId")!));
    }

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

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, [{ count }]] = await Promise.all([
      db.select().from(customers).where(where).orderBy(desc(customers.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(customers).where(where),
    ]);

    return paginated(data, count, page, limit);
  } catch (err: any) {
    if (err.message?.includes("not found") || err.message?.includes("suspended")) {
      return error(err.message, 404);
    }
    console.error("[CUSTOMERS] List error:", err);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) return unauthorized();

  try {
    const host = req.headers.get("host") || "";
    const { orgId, isSuperAdmin } = await getOrganizationFromHost(host);

    if (!isSuperAdmin && !hasOrgAccess(auth, orgId)) return forbidden();

    const body = await req.json();
    const targetOrgId = isSuperAdmin ? (body.organizationId || orgId) : orgId;

    if (!targetOrgId) return error("organizationId is required for super admin");

    const { firstName, lastName, phoneMobile, address, bundle } = body;
    if (!firstName || !lastName || !phoneMobile || !address || !bundle) {
      return error("firstName, lastName, phoneMobile, address, and bundle are required");
    }

    const [customer] = await db
      .insert(customers)
      .values({
        organizationId: targetOrgId,
        firstName, lastName,
        birthYear: body.birthYear,
        phoneHome: body.phoneHome,
        phoneMobile,
        address,
        floor: body.floor,
        apartment: body.apartment,
        district: body.district,
        city: body.city || "Antalya",
        language: body.language || "de",
        bundle,
        medicalNotes: body.medicalNotes,
        deviceIdHub: body.deviceIdHub,
        deviceIdMobile: body.deviceIdMobile,
        monthlyFee: body.monthlyFee?.toString(),
        contractStart: body.contractStart,
        notes: body.notes,
      })
      .returning();

    await logAudit({ operator: auth, action: "customer_created", entityType: "customer", entityId: customer.id });
    return created(customer);
  } catch (err) {
    console.error("[CUSTOMERS] Create error:", err);
    return serverError();
  }
}
