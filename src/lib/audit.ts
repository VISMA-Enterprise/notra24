import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { JWTPayload } from "./auth";

export async function logAudit(params: {
  operator?: JWTPayload | null;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}) {
  try {
    await db.insert(auditLog).values({
      operatorId: params.operator?.operatorId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      details: params.details ?? null,
      ipAddress: params.ipAddress ?? null,
    });
  } catch (err) {
    console.error("[AUDIT] Failed to log:", err);
  }
}
