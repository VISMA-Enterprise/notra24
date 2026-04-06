import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { operators } from "@/db/schema";
import { eq } from "drizzle-orm";
import { comparePassword, signToken } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const [operator] = await db
      .select()
      .from(operators)
      .where(eq(operators.email, email.toLowerCase().trim()))
      .limit(1);

    if (!operator || !operator.active) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const valid = await comparePassword(password, operator.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Update last login
    await db
      .update(operators)
      .set({ lastLogin: new Date() })
      .where(eq(operators.id, operator.id));

    const token = signToken({
      operatorId: operator.id,
      email: operator.email,
      role: operator.role,
      name: operator.name,
    });

    await logAudit({
      operator: {
        operatorId: operator.id,
        email: operator.email,
        role: operator.role,
        name: operator.name,
      },
      action: "login",
      entityType: "operator",
      entityId: operator.id,
      ipAddress:
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        undefined,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        token,
        operator: {
          id: operator.id,
          name: operator.name,
          email: operator.email,
          role: operator.role,
          language: operator.language,
          phoneExtension: operator.phoneExtension,
        },
      },
    });

    // Also set as httpOnly cookie
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 86400, // 24h
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("[AUTH] Login error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
