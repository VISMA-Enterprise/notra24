import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { operators, organizations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { comparePassword, signToken } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getTenantSlug } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const host = req.headers.get("host") || "";
    const slug = getTenantSlug(host);

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find operator
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

    // For non-super-admin: verify operator belongs to this org
    if (slug && slug !== "admin" && operator.role !== "super_admin") {
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, slug))
        .limit(1);

      if (!org || operator.organizationId !== org.id) {
        return NextResponse.json(
          { error: "No access to this location" },
          { status: 403 }
        );
      }
    }

    // Resolve org name for token
    let orgSlug = slug || "admin";
    if (operator.organizationId) {
      const [org] = await db
        .select({ slug: organizations.slug })
        .from(organizations)
        .where(eq(organizations.id, operator.organizationId))
        .limit(1);
      if (org) orgSlug = org.slug;
    }

    await db
      .update(operators)
      .set({ lastLogin: new Date() })
      .where(eq(operators.id, operator.id));

    const token = signToken({
      operatorId: operator.id,
      email: operator.email,
      role: operator.role,
      name: operator.name,
      organizationId: operator.organizationId,
      slug: orgSlug,
    });

    await logAudit({
      operator: {
        operatorId: operator.id,
        email: operator.email,
        role: operator.role,
        name: operator.name,
        organizationId: operator.organizationId,
        slug: orgSlug,
      },
      action: "login",
      entityType: "operator",
      entityId: operator.id,
      ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
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
          organizationId: operator.organizationId,
        },
      },
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 86400,
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
