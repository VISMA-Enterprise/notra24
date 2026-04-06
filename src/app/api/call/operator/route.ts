import { NextRequest } from "next/server";
import { authenticateRequest, unauthorized } from "@/lib/auth";
import { callOperatorGroup } from "@/lib/freepbx";
import { success, error, serverError } from "@/lib/response";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) return unauthorized();

  try {
    const result = await callOperatorGroup();
    if (!result.success) return error(`Call failed: ${result.error}`);
    await logAudit({ operator: auth, action: "call_operator_group", entityType: "call", details: { callSid: result.callSid } });
    return success({ callSid: result.callSid });
  } catch (err) {
    return serverError();
  }
}
