"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

const ALERT_LABELS: Record<string, string> = {
  sos: "SOS", fall: "Sturz", smoke: "Rauch", co: "CO", low_battery: "Akku",
  device_offline: "Offline", power_failure: "Strom", door_open: "Tür", test: "Test", manual: "Manuell",
};

function formatDate(d: string) {
  return new Date(d).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatDuration(s: number | null) {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function CasesPage() {
  const { operator, authFetch, logout, loading } = useAuth();
  const router = useRouter();
  const [cases, setCases] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);

  useEffect(() => { if (!loading && !operator) router.push("/"); }, [operator, loading]);
  useEffect(() => { loadCases(); }, [filterStatus, filterType, dateFrom, dateTo, pagination.page]);

  const loadCases = async () => {
    try {
      const params = new URLSearchParams({ page: String(pagination.page), limit: "25" });
      if (filterStatus) params.set("status", filterStatus);
      if (filterType) params.set("alertType", filterType);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const res = await authFetch(`/api/cases?${params}`);
      if (res.success) { setCases(res.data); setPagination(res.pagination); }
    } catch {}
  };

  const loadTimeline = async (caseId: string) => {
    try {
      const [caseRes, tlRes] = await Promise.all([
        authFetch(`/api/cases/${caseId}`),
        authFetch(`/api/cases/${caseId}/timeline`),
      ]);
      if (caseRes.success) setSelectedCase(caseRes.data);
      if (tlRes.success) setTimeline(tlRes.data);
    } catch {}
  };

  const exportCSV = () => {
    const header = "Datum,Kunde,Typ,Operator,Dauer,Status\n";
    const rows = cases.map(c => `"${formatDate(c.createdAt)}","${c.customerFirstName} ${c.customerLastName}","${c.alertType}","${c.operatorName || "—"}","${formatDuration(c.durationSeconds)}","${c.status}"`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `notra24-cases-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };

  if (loading || !operator) return null;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <header className="flex items-center justify-between px-6 py-3" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <a href="/dashboard" className="text-lg font-bold" style={{ color: "var(--gold)" }}>NOTRA 24</a>
        <nav className="flex items-center gap-4 text-sm">
          <a href="/dashboard" style={{ color: "var(--muted)" }}>Dashboard</a>
          <a href="/customers" style={{ color: "var(--muted)" }}>Kunden</a>
          <a href="/cases" className="font-medium" style={{ color: "var(--gold)" }}>Vorfälle</a>
          <a href="/status" style={{ color: "var(--muted)" }}>System</a>
          <button onClick={logout} className="text-xs" style={{ color: "var(--red-alert)" }}>Abmelden</button>
        </nav>
      </header>

      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Vorfallshistorie</h2>
          <button onClick={exportCSV} className="px-4 py-2 rounded-lg text-sm" style={{ border: "1px solid var(--border)", color: "var(--muted)" }}>📥 CSV Export</button>
        </div>

        <div className="flex gap-3 mb-4 flex-wrap">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-lg text-sm" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
            <option value="">Alle Status</option>
            <option value="open">Offen</option>
            <option value="in_progress">In Bearbeitung</option>
            <option value="resolved">Gelöst</option>
            <option value="false_alarm">Fehlalarm</option>
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-2 rounded-lg text-sm" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
            <option value="">Alle Typen</option>
            {Object.entries(ALERT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 rounded-lg text-sm" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 rounded-lg text-sm" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
        </div>

        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full text-sm">
            <thead><tr style={{ background: "var(--surface)" }}>
              <th className="text-left p-3 font-medium" style={{ color: "var(--muted)" }}>Datum</th>
              <th className="text-left p-3 font-medium" style={{ color: "var(--muted)" }}>Kunde</th>
              <th className="text-left p-3 font-medium" style={{ color: "var(--muted)" }}>Typ</th>
              <th className="text-left p-3 font-medium" style={{ color: "var(--muted)" }}>Operator</th>
              <th className="text-left p-3 font-medium" style={{ color: "var(--muted)" }}>Dauer</th>
              <th className="text-left p-3 font-medium" style={{ color: "var(--muted)" }}>Status</th>
            </tr></thead>
            <tbody>
              {cases.map(c => (
                <tr key={c.id} className="cursor-pointer hover:opacity-80" style={{ borderTop: "1px solid var(--border)" }} onClick={() => loadTimeline(c.id)}>
                  <td className="p-3 mono text-xs">{formatDate(c.createdAt)}</td>
                  <td className="p-3">{c.customerFirstName} {c.customerLastName}</td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full badge-${c.priority}`}>{ALERT_LABELS[c.alertType] || c.alertType}</span></td>
                  <td className="p-3" style={{ color: "var(--muted)" }}>{c.operatorName || "—"}</td>
                  <td className="p-3 mono">{formatDuration(c.durationSeconds)}</td>
                  <td className="p-3"><span style={{ color: c.status === "resolved" ? "var(--green-ok)" : c.status === "open" ? "var(--red-alert)" : "var(--yellow-warn)" }}>● {c.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Timeline Modal */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setSelectedCase(null)}>
          <div className="rounded-xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto" style={{ background: "var(--surface)", border: "1px solid var(--border)" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Case Timeline</h3>
            <div className="space-y-3">
              {timeline.map((t, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <span className="mono text-xs shrink-0" style={{ color: "var(--muted)" }}>{new Date(t.createdAt).toLocaleTimeString("de-DE")}</span>
                  <div>
                    <span className="font-medium">{t.action}</span>
                    {t.details && <span className="text-xs block" style={{ color: "var(--muted)" }}>{JSON.stringify(t.details)}</span>}
                  </div>
                </div>
              ))}
              {timeline.length === 0 && <p style={{ color: "var(--muted)" }}>Keine Timeline-Einträge</p>}
            </div>
            <button onClick={() => setSelectedCase(null)} className="mt-4 px-4 py-2 rounded-lg text-sm w-full" style={{ border: "1px solid var(--border)", color: "var(--muted)" }}>Schließen</button>
          </div>
        </div>
      )}
    </div>
  );
}
