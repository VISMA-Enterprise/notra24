import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers, cases, deviceHeartbeats } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { wsManager } from "@/lib/websocket";
import { logAudit } from "@/lib/audit";

const CRITICAL_EVENTS = ["sos", "fall"];
const HIGH_EVENTS = ["smoke", "co", "power_failure"];
const MEDIUM_EVENTS = ["device_offline", "door_open"];

function getPriority(eventType: string): "critical" | "high" | "medium" | "low" {
  if (CRITICAL_EVENTS.includes(eventType)) return "critical";
  if (HIGH_EVENTS.includes(eventType)) return "high";
  if (MEDIUM_EVENTS.includes(eventType)) return "medium";
  return "low";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { device_id, event_type, timestamp, gps_lat, gps_lng, raw, battery, signal_strength } = body;

    if (!device_id || !event_type) {
      return NextResponse.json({ error: "device_id and event_type required" }, { status: 400 });
    }

    console.log(`[ALARM] Incoming: device=${device_id} type=${event_type}`);

    // Find customer + their org
    const [customer] = await db
      .select()
      .from(customers)
      .where(or(eq(customers.deviceIdHub, device_id), eq(customers.deviceIdMobile, device_id)))
      .limit(1);

    const orgId = customer?.organizationId || null;
    const alertSource = customer?.deviceIdHub === device_id ? "hub" : "mobile";

    // Heartbeat
    if (event_type === "heartbeat") {
      const deviceType = customer?.deviceIdHub === device_id ? "hub" : "mobile";
      const status = battery !== null && battery < 20 ? "low_battery" : "online";

      await db.insert(deviceHeartbeats).values({
        organizationId: orgId,
        deviceId: device_id,
        customerId: customer?.id ?? null,
        deviceType: deviceType as "hub" | "mobile",
        batteryLevel: battery ?? null,
        signalStrength: signal_strength ?? null,
        gpsLat: gps_lat?.toString() ?? null,
        gpsLng: gps_lng?.toString() ?? null,
        status,
        rawPayload: body,
      });

      wsManager.broadcast({ type: "device_status", device_id, status, battery_level: battery, customer_id: customer?.id, organization_id: orgId });
      return NextResponse.json({ success: true, action: "heartbeat_recorded" });
    }

    // Create case — with organization context
    const priority = getPriority(event_type);

    const [newCase] = await db.insert(cases).values({
      organizationId: orgId || "00000000-0000-0000-0000-000000000000",
      customerId: customer?.id ?? "00000000-0000-0000-0000-000000000000",
      alertType: event_type as any,
      alertSource: alertSource as any,
      gpsLat: gps_lat?.toString() ?? null,
      gpsLng: gps_lng?.toString() ?? null,
      priority,
      status: "open",
      notes: customer ? undefined : `Unknown device: ${device_id}. Raw: ${raw}`,
    }).returning();

    wsManager.broadcast({
      type: "alarm",
      case: newCase,
      customer: customer ?? { id: null, firstName: "Unknown", lastName: "Device" },
      organization_id: orgId,
    });

    await logAudit({
      action: "alarm_received",
      entityType: "case",
      entityId: newCase.id,
      details: { device_id, event_type, priority, customer_id: customer?.id ?? null, organization_id: orgId },
    });

    return NextResponse.json({ success: true, data: { case_id: newCase.id, priority, customer_found: !!customer } });
  } catch (err) {
    console.error("[ALARM] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
