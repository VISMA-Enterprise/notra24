import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, unauthorized } from "@/lib/auth";
import { db } from "@/db";
import { operators } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const payload = await authenticateRequest(req);
  if (!payload) return unauthorized();

  const [operator] = await db
    .select({
      id: operators.id,
      name: operators.name,
      email: operators.email,
      role: operators.role,
      language: operators.language,
      phoneExtension: operators.phoneExtension,
      lastLogin: operators.lastLogin,
    })
    .from(operators)
    .where(eq(operators.id, payload.operatorId))
    .limit(1);

  if (!operator) return unauthorized();

  return NextResponse.json({ success: true, data: operator });
}
