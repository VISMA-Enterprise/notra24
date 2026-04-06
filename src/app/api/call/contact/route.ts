import { NextRequest } from "next/server";
import { authenticateRequest, unauthorized } from "@/lib/auth";
import { initiateCall } from "@/lib/freepbx";
import { success, error, serverError } from "@/lib/response";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) return unauthorized();

  try {
    const { phone, contactName, caseId } = await req.json();
    if (!phone) return error("phone is required");

    const result = await initiateCall("101", phone);
    if (!result.success) return error(`Call failed: ${result.error}`);

    await logAudit({ operator: auth, action: "call_emergency_contact", entityType: "case", entityId: caseId, details: { phone, contactName, callSid: result.callSid } });
    return success({ callSid: result.callSid });
  } catch (err) {
    return serverError();
  }
}
