import { NextRequest } from "next/server";
import { db } from "@/db";
import { cases, customers, operators } from "@/db/schema";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { authenticateRequest, unauthorized, forbidden, hasOrgAccess } from "@/lib/auth";
import { paginated, created, error, serverError } from "@/lib/response";
import { logAudit } from "@/lib/audit";
import { getOrganizationFromHost } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) return unauthorized();

  try {
    const host = req.headers.get("host") || "";
    const { orgId, isSuperAdmin } = await getOrganizationFromHost(host);
    if (!isSuperAdmin && !hasOrgAccess(auth, orgId)) return forbidden();

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, parseInt(url.searchParams.get("limit") || "25"));
    const status = url.searchParams.get("status");
    const alertType = url.searchParams.get("alertType");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const offset = (page - 1) * limit;

    const conditions = [];
    if (!isSuperAdmin && orgId) conditions.push(eq(cases.organizationId, orgId));
    if (status) conditions.push(eq(cases.status, status as any));
    if (alertType) conditions.push(eq(cases.alertType, alertType as any));
    if (from) conditions.push(gte(cases.createdAt, new Date(from)));
    if (to) conditions.push(lte(cases.createdAt, new Date(to)));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, [{ count }]] = await Promise.all([
      db.select({
        id: cases.id, createdAt: cases.createdAt, resolvedAt: cases.resolvedAt,
        customerId: cases.customerId, customerFirstName: customers.firstName,
        customerLastName: customers.lastName, operatorId: cases.operatorId,
        operatorName: operators.name, alertType: cases.alertType,
        alertSource: cases.alertSource, status: cases.status,
        priority: cases.priority, durationSeconds: cases.durationSeconds, notes: cases.notes,
        organizationId: cases.organizationId,
      })
        .from(cases)
        .leftJoin(customers, eq(cases.customerId, customers.id))
        .leftJoin(operators, eq(cases.operatorId, operators.id))
        .where(where)
        .orderBy(desc(cases.createdAt))
        .limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(cases).where(where),
    ]);

    return paginated(data, count, page, limit);
  } catch (err: any) {
    if (err.message?.includes("not found")) return error(err.message, 404);
    console.error("[CASES] List error:", err);
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
    if (!body.customerId || !body.alertType) return error("customerId and alertType are required");

    const targetOrgId = isSuperAdmin ? (body.organizationId || orgId) : orgId;
    if (!targetOrgId) return error("Organization context required");

    const [newCase] = await db.insert(cases).values({
      organizationId: targetOrgId,
      customerId: body.customerId,
      operatorId: auth.operatorId,
      alertType: body.alertType,
      alertSource: body.alertSource || "manual",
      priority: body.priority || "medium",
      notes: body.notes,
    }).returning();

    await logAudit({ operator: auth, action: "case_created_manual", entityType: "case", entityId: newCase.id });
    return created(newCase);
  } catch (err) {
    console.error("[CASES] Create error:", err);
    return serverError();
  }
}
