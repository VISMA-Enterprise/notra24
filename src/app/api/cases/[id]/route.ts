import { NextRequest } from "next/server";
import { db } from "@/db";
import { cases, customers, operators, emergencyContacts } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { authenticateRequest, unauthorized } from "@/lib/auth";
import { success, notFound, serverError } from "@/lib/response";
import { logAudit } from "@/lib/audit";
import { wsManager } from "@/lib/websocket";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if (!auth) return unauthorized();
  const { id } = await params;

  try {
    const [caseData] = await db.select().from(cases).where(eq(cases.id, id)).limit(1);
    if (!caseData) return notFound("Case not found");

    const [customer] = await db.select().from(customers).where(eq(customers.id, caseData.customerId)).limit(1);
    const contacts = customer
      ? await db.select().from(emergencyContacts).where(eq(emergencyContacts.customerId, customer.id)).orderBy(asc(emergencyContacts.priority))
      : [];
    const operator = caseData.operatorId
      ? (await db.select({ id: operators.id, name: operators.name, email: operators.email }).from(operators).where(eq(operators.id, caseData.operatorId)).limit(1))[0]
      : null;

    return success({ ...caseData, customer, contacts, operator });
  } catch (err) {
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
    const updates: Record<string, any> = {};

    if (body.status) updates.status = body.status;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.operatorId) updates.operatorId = body.operatorId;
    if (body.resolutionNote) updates.resolutionNote = body.resolutionNote;

    if (body.status === "resolved" || body.status === "false_alarm") {
      updates.resolvedAt = new Date();
      updates.resolvedBy = auth.operatorId;
      // Calculate duration
      const [existing] = await db.select({ createdAt: cases.createdAt }).from(cases).where(eq(cases.id, id)).limit(1);
      if (existing) {
        updates.durationSeconds = Math.floor((Date.now() - existing.createdAt.getTime()) / 1000);
      }
    }

    // Assign operator if taking case
    if (body.status === "in_progress" && !body.operatorId) {
      updates.operatorId = auth.operatorId;
    }

    const [updated] = await db.update(cases).set(updates).where(eq(cases.id, id)).returning();
    if (!updated) return notFound("Case not found");

    wsManager.broadcast({ type: "case_updated", case: updated });
    await logAudit({ operator: auth, action: "case_updated", entityType: "case", entityId: id, details: updates });
    return success(updated);
  } catch (err) {
    return serverError();
  }
}
