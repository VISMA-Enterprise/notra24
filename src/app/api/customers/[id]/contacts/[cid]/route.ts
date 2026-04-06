import { NextRequest } from "next/server";
import { db } from "@/db";
import { emergencyContacts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { authenticateRequest, unauthorized } from "@/lib/auth";
import { success, notFound, serverError } from "@/lib/response";
import { logAudit } from "@/lib/audit";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; cid: string }> }
) {
  const auth = await authenticateRequest(req);
  if (!auth) return unauthorized();
  const { id, cid } = await params;

  try {
    const body = await req.json();
    const [updated] = await db
      .update(emergencyContacts)
      .set(body)
      .where(and(eq(emergencyContacts.id, cid), eq(emergencyContacts.customerId, id)))
      .returning();

    if (!updated) return notFound("Contact not found");
    await logAudit({ operator: auth, action: "contact_updated", entityType: "emergency_contact", entityId: cid });
    return success(updated);
  } catch (err) {
    return serverError();
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; cid: string }> }
) {
  const auth = await authenticateRequest(req);
  if (!auth) return unauthorized();
  const { id, cid } = await params;

  try {
    const [deleted] = await db
      .delete(emergencyContacts)
      .where(and(eq(emergencyContacts.id, cid), eq(emergencyContacts.customerId, id)))
      .returning();

    if (!deleted) return notFound("Contact not found");
    await logAudit({ operator: auth, action: "contact_deleted", entityType: "emergency_contact", entityId: cid });
    return success({ message: "Contact deleted" });
  } catch (err) {
    return serverError();
  }
}
