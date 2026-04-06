"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

export default function StatusPage() {
  const { operator, authFetch, logout, loading } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<any>(null);

  useEffect(() => { if (!loading && !operator) router.push("/"); }, [operator, loading]);
  useEffect(() => { loadStatus(); const i = setInterval(loadStatus, 30000); return () => clearInterval(i); }, []);

  const loadStatus = async () => {
    try {
      const res = await authFetch("/api/status");
      if (res.success) setStatus(res.data);
    } catch {}
  };

  if (loading || !operator) return null;

  const comp = status?.components || {};
  const statusColor = (s: string) => s === "online" ? "var(--green-ok)" : s === "offline" ? "var(--red-alert)" : "var(--yellow-warn)";
  const statusIcon = (s: string) => s === "online" ? "🟢" : s === "offline" ? "🔴" : "🟡";

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <header className="flex items-center justify-between px-6 py-3" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <a href="/dashboard" className="text-lg font-bold" style={{ color: "var(--gold)" }}>NOTRA 24</a>
        <nav className="flex items-center gap-4 text-sm">
          <a href="/dashboard" style={{ color: "var(--muted)" }}>Dashboard</a>
          <a href="/customers" style={{ color: "var(--muted)" }}>Kunden</a>
          <a href="/cases" style={{ color: "var(--muted)" }}>Vorfälle</a>
          <a href="/status" className="font-medium" style={{ color: "var(--gold)" }}>System</a>
          <button onClick={logout} className="text-xs" style={{ color: "var(--red-alert)" }}>Abmelden</button>
        </nav>
      </header>

      <div className="p-6 max-w-4xl mx-auto">
        <h2 className="text-xl font-semibold mb-6">System-Status</h2>

        {status && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {Object.entries(comp).map(([name, info]: [string, any]) => (
                <div key={name} className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span>{statusIcon(info.status)}</span>
                    <span className="text-sm font-semibold uppercase">{name.replace("_", " ")}</span>
                  </div>
                  <p className="text-xs" style={{ color: statusColor(info.status) }}>{info.status}</p>
                  <p className="text-xs mt-1 mono" style={{ color: "var(--muted)" }}>{info.details}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl p-5 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <p className="text-3xl font-bold" style={{ color: "var(--green-ok)" }}>{status.customers?.active || 0}</p>
                <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>Aktive Kunden</p>
              </div>
              <div className="rounded-xl p-5 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <p className="text-3xl font-bold" style={{ color: "var(--red-alert)" }}>{status.cases?.open || 0}</p>
                <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>Offene Cases</p>
              </div>
              <div className="rounded-xl p-5 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <p className="text-3xl font-bold" style={{ color: "var(--yellow-warn)" }}>{status.cases?.in_progress || 0}</p>
                <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>In Bearbeitung</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
