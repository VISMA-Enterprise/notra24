import { NextRequest } from "next/server";
import { db } from "@/db";
import { cases } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { authenticateRequest, unauthorized } from "@/lib/auth";
import { paginated, serverError } from "@/lib/response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if (!auth) return unauthorized();

  const { id } = await params;
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, parseInt(url.searchParams.get("limit") || "25"));
  const offset = (page - 1) * limit;

  try {
    const [data, [{ count }]] = await Promise.all([
      db.select().from(cases).where(eq(cases.customerId, id)).orderBy(desc(cases.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(cases).where(eq(cases.customerId, id)),
    ]);
    return paginated(data, count, page, limit);
  } catch (err) {
    console.error("[CUSTOMER CASES] Error:", err);
    return serverError();
  }
}
