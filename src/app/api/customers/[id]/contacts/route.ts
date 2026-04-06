import { NextRequest } from "next/server";
import { db } from "@/db";
import { emergencyContacts } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { authenticateRequest, unauthorized } from "@/lib/auth";
import { success, created, error, serverError } from "@/lib/response";
import { logAudit } from "@/lib/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if (!auth) return unauthorized();
  const { id } = await params;

  try {
    const contacts = await db
      .select()
      .from(emergencyContacts)
      .where(eq(emergencyContacts.customerId, id))
      .orderBy(asc(emergencyContacts.priority));
    return success(contacts);
  } catch (err) {
    return serverError();
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if (!auth) return unauthorized();
  const { id } = await params;

  try {
    const body = await req.json();
    if (!body.name || !body.phone || !body.priority) {
      return error("name, phone, and priority are required");
    }

    const [contact] = await db
      .insert(emergencyContacts)
      .values({ customerId: id, ...body })
      .returning();

    await logAudit({ operator: auth, action: "contact_created", entityType: "emergency_contact", entityId: contact.id });
    return created(contact);
  } catch (err) {
    return serverError();
  }
}
