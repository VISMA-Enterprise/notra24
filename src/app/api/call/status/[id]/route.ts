import { NextRequest } from "next/server";
import { authenticateRequest, unauthorized } from "@/lib/auth";
import { getCallStatus } from "@/lib/freepbx";
import { success, notFound, serverError } from "@/lib/response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if (!auth) return unauthorized();
  const { id } = await params;

  try {
    const status = await getCallStatus(id);
    if (!status) return notFound("Call not found");
    return success(status);
  } catch (err) {
    return serverError();
  }
}
