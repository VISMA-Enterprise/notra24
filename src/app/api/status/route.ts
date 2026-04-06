import { NextRequest } from "next/server";
import { db } from "@/db";
import { customers, cases, deviceHeartbeats } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { authenticateRequest, unauthorized } from "@/lib/auth";
import { success, serverError } from "@/lib/response";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) return unauthorized();

  try {
    const [customerCount] = await db.select({ count: sql<number>`count(*)::int` }).from(customers).where(eq(customers.status, "active"));
    const [openCases] = await db.select({ count: sql<number>`count(*)::int` }).from(cases).where(eq(cases.status, "open"));
    const [inProgressCases] = await db.select({ count: sql<number>`count(*)::int` }).from(cases).where(eq(cases.status, "in_progress"));

    // Component status checks
    const components = {
      database: { status: "online", details: "PostgreSQL connected" },
      alarm_receiver: { status: "unknown", details: "Check TCP port 5001" },
      freepbx: { status: "unknown", details: "Check HTTP port 8080" },
      n8n: { status: "unknown", details: "Check HTTP port 5678" },
    };

    // Try to ping services
    try {
      const n8nRes = await fetch(`${process.env.N8N_URL || "http://localhost:5678"}/healthz`, { signal: AbortSignal.timeout(3000) });
      components.n8n = { status: n8nRes.ok ? "online" : "error", details: `HTTP ${n8nRes.status}` };
    } catch { components.n8n = { status: "offline", details: "Connection refused" }; }

    try {
      const pbxRes = await fetch(`${process.env.FREEPBX_URL || "http://localhost:8080"}/admin`, { signal: AbortSignal.timeout(3000) });
      components.freepbx = { status: pbxRes.ok ? "online" : "error", details: `HTTP ${pbxRes.status}` };
    } catch { components.freepbx = { status: "offline", details: "Connection refused" }; }

    return success({
      customers: { active: customerCount.count },
      cases: { open: openCases.count, in_progress: inProgressCases.count },
      components,
    });
  } catch (err) {
    return serverError();
  }
}
