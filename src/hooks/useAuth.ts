"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Operator {
  id: string;
  name: string;
  email: string;
  role: "operator" | "admin" | "super_admin";
  language: string;
  phoneExtension: string | null;
  organizationId: string | null;
}

interface AuthState {
  operator: Operator | null;
  token: string | null;
  loading: boolean;
  slug: string;
  isSuperAdmin: boolean;
}

function getSlugFromHost(): string {
  if (typeof window === "undefined") return "unknown";
  const match = window.location.hostname.match(/^([^.]+)\.notra24\.com$/);
  return match ? match[1] : "unknown";
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    operator: null,
    token: null,
    loading: true,
    slug: "",
    isSuperAdmin: false,
  });
  const router = useRouter();

  useEffect(() => {
    const slug = getSlugFromHost();
    const token = localStorage.getItem("token");
    const operator = localStorage.getItem("operator");
    if (token && operator) {
      const op = JSON.parse(operator);
      setState({
        token, operator: op, loading: false,
        slug, isSuperAdmin: op.role === "super_admin" || slug === "admin",
      });
    } else {
      setState((s) => ({ ...s, loading: false, slug }));
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    localStorage.setItem("token", data.data.token);
    localStorage.setItem("operator", JSON.stringify(data.data.operator));
    const slug = getSlugFromHost();
    setState({
      token: data.data.token, operator: data.data.operator, loading: false,
      slug, isSuperAdmin: data.data.operator.role === "super_admin",
    });
    router.push("/dashboard");
    return data.data;
  }, [router]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    localStorage.removeItem("token");
    localStorage.removeItem("operator");
    setState({ token: null, operator: null, loading: false, slug: getSlugFromHost(), isSuperAdmin: false });
    router.push("/");
  }, [router]);

  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem("token");
    const res = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options.headers },
    });
    if (res.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("operator");
      router.push("/");
      throw new Error("Session expired");
    }
    return res.json();
  }, [router]);

  return { ...state, login, logout, authFetch };
}
