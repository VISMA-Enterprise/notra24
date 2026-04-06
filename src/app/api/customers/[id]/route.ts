import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authenticateRequest, unauthorized } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { success, notFound, error, serverError } from "@/lib/response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if (!auth) return unauthorized();

  const { id } = await params;

  try {
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);

    if (!customer) return notFound("Customer not found");
    return success(customer);
  } catch (err) {
    console.error("[CUSTOMERS] Get error:", err);
    return serverError();
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if (!auth) return unauthorized();

  const { id } = await params;

  try {
    const body = await req.json();
    const [existing] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);

    if (!existing) return notFound("Customer not found");

    const [updated] = await db
      .update(customers)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();

    await logAudit({
      operator: auth,
      action: "customer_updated",
      entityType: "customer",
      entityId: id,
      details: body,
    });

    return success(updated);
  } catch (err) {
    console.error("[CUSTOMERS] Update error:", err);
    return serverError();
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if (!auth) return unauthorized();

  const { id } = await params;

  try {
    const [updated] = await db
      .update(customers)
      .set({ status: "inactive", updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();

    if (!updated) return notFound("Customer not found");

    await logAudit({
      operator: auth,
      action: "customer_deactivated",
      entityType: "customer",
      entityId: id,
    });

    return success({ message: "Customer deactivated" });
  } catch (err) {
    console.error("[CUSTOMERS] Delete error:", err);
    return serverError();
  }
}
