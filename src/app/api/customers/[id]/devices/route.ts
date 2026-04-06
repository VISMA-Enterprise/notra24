import { NextRequest } from "next/server";
import { db } from "@/db";
import { deviceHeartbeats, customers } from "@/db/schema";
import { eq, or, desc } from "drizzle-orm";
import { authenticateRequest, unauthorized } from "@/lib/auth";
import { success, notFound, serverError } from "@/lib/response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if (!auth) return unauthorized();

  const { id } = await params;

  try {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    if (!customer) return notFound("Customer not found");

    const deviceIds = [customer.deviceIdHub, customer.deviceIdMobile].filter(Boolean);
    if (deviceIds.length === 0) return success([]);

    const heartbeats = await db
      .select()
      .from(deviceHeartbeats)
      .where(or(...deviceIds.map((did) => eq(deviceHeartbeats.deviceId, did!))))
      .orderBy(desc(deviceHeartbeats.receivedAt))
      .limit(20);

    return success({
      hub: { deviceId: customer.deviceIdHub, heartbeats: heartbeats.filter(h => h.deviceId === customer.deviceIdHub) },
      mobile: { deviceId: customer.deviceIdMobile, heartbeats: heartbeats.filter(h => h.deviceId === customer.deviceIdMobile) },
    });
  } catch (err) {
    console.error("[CUSTOMER DEVICES] Error:", err);
    return serverError();
  }
}
