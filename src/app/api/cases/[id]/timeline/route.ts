import { NextRequest } from "next/server";
import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { authenticateRequest, unauthorized } from "@/lib/auth";
import { success, serverError } from "@/lib/response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if (!auth) return unauthorized();
  const { id } = await params;

  try {
    const timeline = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entityId, id))
      .orderBy(asc(auditLog.createdAt));
    return success(timeline);
  } catch (err) {
    return serverError();
  }
}
