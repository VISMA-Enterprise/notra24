import { NextRequest } from "next/server";
import { authenticateRequest, unauthorized } from "@/lib/auth";
import { initiateCall } from "@/lib/freepbx";
import { success, error, serverError } from "@/lib/response";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) return unauthorized();

  try {
    const { phone, caseId } = await req.json();
    if (!phone) return error("phone is required");

    const extension = auth.operatorId ? "101" : "100";
    const result = await initiateCall(extension, phone);
    if (!result.success) return error(`Call failed: ${result.error}`);

    await logAudit({ operator: auth, action: "call_customer", entityType: "case", entityId: caseId, details: { phone, callSid: result.callSid } });
    return success({ callSid: result.callSid });
  } catch (err) {
    return serverError();
  }
}
