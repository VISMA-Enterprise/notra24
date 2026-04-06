"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Operator {
  id: string;
  name: string;
  email: string;
  role: "operator" | "admin";
  language: string;
  phoneExtension: string | null;
}

interface AuthState {
  operator: Operator | null;
  token: string | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    operator: null,
    token: null,
    loading: true,
  });
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const operator = localStorage.getItem("operator");
    if (token && operator) {
      setState({ token, operator: JSON.parse(operator), loading: false });
    } else {
      setState((s) => ({ ...s, loading: false }));
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
    setState({ token: data.data.token, operator: data.data.operator, loading: false });
    router.push("/dashboard");
    return data.data;
  }, [router]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    localStorage.removeItem("token");
    localStorage.removeItem("operator");
    setState({ token: null, operator: null, loading: false });
    router.push("/");
  }, [router]);

  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem("token");
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
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
