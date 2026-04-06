import { NextRequest } from "next/server";
import { db } from "@/db";
import { organizations, customers, operators, cases } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { authenticateRequest, unauthorized, forbidden } from "@/lib/auth";
import { success, created, error, serverError } from "@/lib/response";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) return unauthorized();
  if (auth.role !== "super_admin") return forbidden("Super admin access required");

  try {
    const orgs = await db.select().from(organizations).orderBy(desc(organizations.createdAt));

    // Enrich with counts
    const enriched = await Promise.all(
      orgs.map(async (org) => {
        const [customerCount] = await db.select({ count: sql<number>`count(*)::int` }).from(customers).where(eq(customers.organizationId, org.id));
        const [operatorCount] = await db.select({ count: sql<number>`count(*)::int` }).from(operators).where(eq(operators.organizationId, org.id));
        const [openCases] = await db.select({ count: sql<number>`count(*)::int` }).from(cases).where(eq(cases.organizationId, org.id));

        return {
          ...org,
          customerCount: customerCount.count,
          operatorCount: operatorCount.count,
          openCaseCount: openCases.count,
        };
      })
    );

    return success(enriched);
  } catch (err) {
    console.error("[ORGS] List error:", err);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) return unauthorized();
  if (auth.role !== "super_admin") return forbidden("Super admin access required");

  try {
    const body = await req.json();
    if (!body.name || !body.slug || !body.city) {
      return error("name, slug, and city are required");
    }

    // Check slug uniqueness
    const [existing] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.slug, body.slug)).limit(1);
    if (existing) return error("Slug already in use");

    const [org] = await db.insert(organizations).values({
      name: body.name,
      slug: body.slug.toLowerCase(),
      city: body.city,
      country: body.country || "TR",
      timezone: body.timezone || "Europe/Istanbul",
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
      maxOperators: body.maxOperators || 5,
      maxCustomers: body.maxCustomers || 100,
      notes: body.notes,
    }).returning();

    await logAudit({ operator: auth, action: "organization_created", entityType: "organization", entityId: org.id, details: { name: org.name, slug: org.slug } });
    return created(org);
  } catch (err) {
    console.error("[ORGS] Create error:", err);
    return serverError();
  }
}
