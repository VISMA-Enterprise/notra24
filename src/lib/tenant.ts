import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Extract tenant slug from subdomain.
 * antalya.notra24.com → "antalya"
 * admin.notra24.com → "admin" (super-admin)
 */
export function getTenantSlug(host: string): string | null {
  // Remove port if present
  const hostname = host.split(":")[0];

  // Check if it's a subdomain of notra24.com
  const match = hostname.match(/^([^.]+)\.notra24\.com$/);
  if (!match) return null;

  const slug = match[1];

  // Exclude system subdomains
  const systemSubdomains = ["www", "auth", "n8n", "api"];
  if (systemSubdomains.includes(slug)) return null;

  return slug;
}

/**
 * Check if the request is from the super-admin dashboard.
 */
export function isSuperAdmin(host: string): boolean {
  const slug = getTenantSlug(host);
  return slug === "admin";
}

/**
 * Resolve organization from subdomain slug.
 */
export async function resolveOrganization(slug: string) {
  if (slug === "admin") return null; // Super-admin, no specific org

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);

  return org || null;
}

/**
 * Get organization ID from request host.
 * Returns null for super-admin.
 * Throws if org not found.
 */
export async function getOrganizationFromHost(
  host: string
): Promise<{ orgId: string | null; slug: string; isSuperAdmin: boolean }> {
  const slug = getTenantSlug(host);

  if (!slug) {
    throw new Error("Invalid subdomain");
  }

  if (slug === "admin") {
    return { orgId: null, slug: "admin", isSuperAdmin: true };
  }

  const org = await resolveOrganization(slug);
  if (!org) {
    throw new Error(`Organization not found: ${slug}`);
  }

  if (org.status !== "active") {
    throw new Error(`Organization suspended: ${slug}`);
  }

  return { orgId: org.id, slug, isSuperAdmin: false };
}
