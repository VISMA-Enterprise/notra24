import { NextRequest } from "next/server";
import { db } from "@/db";
import { customers, deviceHeartbeats } from "@/db/schema";
import { eq, desc, sql, or, isNotNull } from "drizzle-orm";
import { authenticateRequest, unauthorized } from "@/lib/auth";
import { success, serverError } from "@/lib/response";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) return unauthorized();

  try {
    // Get all active customers with devices
    const activeCustomers = await db
      .select()
      .from(customers)
      .where(eq(customers.status, "active"));

    const deviceStatuses = [];

    for (const customer of activeCustomers) {
      const deviceIds = [customer.deviceIdHub, customer.deviceIdMobile].filter(Boolean) as string[];
      if (deviceIds.length === 0) continue;

      // Get latest heartbeat for each device
      const latestHeartbeats = [];
      for (const deviceId of deviceIds) {
        const [hb] = await db
          .select()
          .from(deviceHeartbeats)
          .where(eq(deviceHeartbeats.deviceId, deviceId))
          .orderBy(desc(deviceHeartbeats.receivedAt))
          .limit(1);
        if (hb) latestHeartbeats.push(hb);
      }

      const hubHb = latestHeartbeats.find(h => h.deviceId === customer.deviceIdHub);
      const mobileHb = latestHeartbeats.find(h => h.deviceId === customer.deviceIdMobile);

      deviceStatuses.push({
        customerId: customer.id,
        customerName: `${customer.firstName} ${customer.lastName}`,
        hub: hubHb ? { status: hubHb.status, battery: hubHb.batteryLevel, lastSeen: hubHb.receivedAt } : null,
        mobile: mobileHb ? { status: mobileHb.status, battery: mobileHb.batteryLevel, lastSeen: mobileHb.receivedAt } : null,
      });
    }

    return success(deviceStatuses);
  } catch (err) {
    return serverError();
  }
}
