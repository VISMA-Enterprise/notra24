"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useRouter } from "next/navigation";

interface Case {
  id: string;
  createdAt: string;
  customerId: string;
  alertType: string;
  status: string;
  priority: string;
  notes: string | null;
  customer?: any;
  contacts?: any[];
}

const ALERT_ICONS: Record<string, string> = {
  sos: "🔴", fall: "⚠️", smoke: "🔥", co: "☠️", low_battery: "🔋",
  device_offline: "📡", power_failure: "⚡", door_open: "🚪", test: "🧪", manual: "📝",
};

const ALERT_LABELS: Record<string, string> = {
  sos: "SOS — NOTRUF", fall: "STURZ ERKANNT", smoke: "RAUCHMELDER",
  co: "CO-MELDER", low_battery: "AKKU SCHWACH", device_offline: "GERÄT OFFLINE",
  power_failure: "STROMAUSFALL", door_open: "TÜR GEÖFFNET", test: "TEST", manual: "MANUELL",
};

const BUNDLE_LABELS: Record<string, string> = {
  safe_home: "SAFE HOME", safe_life: "SAFE LIFE", safe_home_plus: "SAFE HOME+",
};

const LANG_FLAGS: Record<string, string> = {
  de: "🇩🇪", tr: "🇹🇷", en: "🇬🇧", ru: "🇷🇺",
};

function timeAgo(date: string): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return `vor ${diff} Sek.`;
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min.`;
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std.`;
  return `vor ${Math.floor(diff / 86400)} Tagen`;
}

export default function DashboardPage() {
  const { operator, authFetch, logout, loading } = useAuth();
  const { connected, initAudio, lastMessage } = useWebSocket();
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [activeCase, setActiveCase] = useState<Case | null>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [notes, setNotes] = useState("");
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayAlert, setOverlayAlert] = useState<any>(null);

  useEffect(() => {
    if (loading) return;
    if (!operator) { router.push("/"); return; }
    loadCases();
    loadDevices();
    const interval = setInterval(loadDevices, 60000);
    return () => clearInterval(interval);
  }, [operator, loading]);

  // Handle new alerts
  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.type === "alarm") {
      const c = lastMessage.case as Case;
      if (["sos", "fall"].includes(c?.alertType)) {
        setShowOverlay(true);
        setOverlayAlert({ ...lastMessage, case: c, customer: lastMessage.customer });
      }
      loadCases();
    }
    if (lastMessage.type === "case_updated") loadCases();
    if (lastMessage.type === "device_status") loadDevices();
  }, [lastMessage]);

  const loadCases = async () => {
    try {
      const res = await authFetch("/api/cases?status=open&limit=50");
      if (res.success) setCases(res.data);
    } catch {}
  };

  const loadDevices = async () => {
    try {
      const res = await authFetch("/api/status/devices");
      if (res.success) setDevices(res.data);
    } catch {}
  };

  const loadCaseDetail = async (c: Case) => {
    try {
      const res = await authFetch(`/api/cases/${c.id}`);
      if (res.success) {
        setActiveCase(res.data);
        setNotes(res.data.notes || "");
      }
    } catch {}
  };

  const updateCase = async (updates: Record<string, any>) => {
    if (!activeCase) return;
    try {
      const res = await authFetch(`/api/cases/${activeCase.id}`, { method: "PUT", body: JSON.stringify(updates) });
      if (res.success) {
        setActiveCase(res.data);
        loadCases();
      }
    } catch {}
  };

  const callCustomer = async () => {
    if (!activeCase?.customer) return;
    try {
      await authFetch("/api/call/customer", {
        method: "POST",
        body: JSON.stringify({ phone: activeCase.customer.phoneMobile, caseId: activeCase.id }),
      });
    } catch {}
  };

  const callContact = async (contact: any) => {
    try {
      await authFetch("/api/call/contact", {
        method: "POST",
        body: JSON.stringify({ phone: contact.phone, contactName: contact.name, caseId: activeCase?.id }),
      });
    } catch {}
  };

  // Auto-save notes
  useEffect(() => {
    if (!activeCase || notes === (activeCase.notes || "")) return;
    const timeout = setTimeout(() => updateCase({ notes }), 5000);
    return () => clearTimeout(timeout);
  }, [notes]);

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}><p style={{ color: "var(--muted)" }}>Laden...</p></div>;
  if (!operator) return null;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }} onClick={initAudio}>
      {/* Alert Overlay */}
      {showOverlay && overlayAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center screen-pulse" style={{ background: "rgba(255,32,32,0.15)", backdropFilter: "blur(4px)" }}>
          <div className="alert-pulse rounded-2xl p-8 max-w-lg w-full mx-4 text-center" style={{ background: "var(--surface)", border: "2px solid var(--red-alert)" }}>
            <div className="text-6xl mb-4">{ALERT_ICONS[overlayAlert.case?.alertType] || "🔴"}</div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--red-alert)" }}>
              {ALERT_LABELS[overlayAlert.case?.alertType] || "ALARM"}
            </h2>
            <p className="text-xl font-semibold mb-1">
              {overlayAlert.customer?.firstName} {overlayAlert.customer?.lastName}
            </p>
            <p className="mono text-sm mb-6" style={{ color: "var(--muted)" }}>
              {overlayAlert.customer?.address}
            </p>
            <button
              onClick={() => { setShowOverlay(false); if (overlayAlert.case) loadCaseDetail(overlayAlert.case); updateCase({ status: "in_progress" }); }}
              className="px-8 py-3 rounded-lg font-bold text-lg uppercase tracking-wider"
              style={{ background: "var(--red-alert)", color: "white" }}
            >
              BESTÄTIGT — ÜBERNEHMEN
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold" style={{ color: "var(--gold)" }}>NOTRA 24</h1>
          <span className="text-xs px-2 py-1 rounded" style={{ background: connected ? "rgba(0,212,106,0.15)" : "rgba(255,32,32,0.15)", color: connected ? "var(--green-ok)" : "var(--red-alert)" }}>
            {connected ? "● LIVE" : "○ OFFLINE"}
          </span>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <a href="/dashboard" className="font-medium" style={{ color: "var(--gold)" }}>Dashboard</a>
          <a href="/customers" style={{ color: "var(--muted)" }}>Kunden</a>
          <a href="/cases" style={{ color: "var(--muted)" }}>Vorfälle</a>
          <a href="/status" style={{ color: "var(--muted)" }}>System</a>
          <span className="text-xs" style={{ color: "var(--muted)" }}>|</span>
          <span className="text-xs" style={{ color: "var(--muted)" }}>{operator.name}</span>
          <button onClick={logout} className="text-xs" style={{ color: "var(--red-alert)" }}>Abmelden</button>
        </nav>
      </header>

      {/* 3-Column Grid */}
      <div className="grid grid-cols-12 gap-0" style={{ height: "calc(100vh - 52px)" }}>
        {/* Left: Alert List */}
        <div className="col-span-3 overflow-y-auto" style={{ borderRight: "1px solid var(--border)" }}>
          <div className="p-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--muted)" }}>
              Offene Alarme ({cases.length})
            </h2>
          </div>
          {cases.map((c) => (
            <div
              key={c.id}
              onClick={() => loadCaseDetail(c)}
              className={`px-4 py-3 cursor-pointer transition-colors priority-${c.priority}`}
              style={{
                background: activeCase?.id === c.id ? "rgba(232,160,32,0.1)" : "transparent",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">
                  {ALERT_ICONS[c.alertType]} {ALERT_LABELS[c.alertType] || c.alertType}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium badge-${c.priority}`}>
                  {c.priority.toUpperCase()}
                </span>
              </div>
              <div className="text-xs mono" style={{ color: "var(--muted)" }}>
                {timeAgo(c.createdAt)}
              </div>
            </div>
          ))}
          {cases.length === 0 && (
            <p className="p-4 text-sm text-center" style={{ color: "var(--muted)" }}>Keine offenen Alarme</p>
          )}
        </div>

        {/* Middle: Active Case */}
        <div className="col-span-5 overflow-y-auto" style={{ borderRight: "1px solid var(--border)" }}>
          {activeCase ? (
            <div className="p-5">
              {/* Alert Header */}
              <div className="rounded-xl p-5 mb-4" style={{ background: "var(--surface)", border: `2px solid ${activeCase.priority === "critical" ? "var(--red-alert)" : "var(--border)"}` }}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{ALERT_ICONS[activeCase.alertType]}</span>
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: activeCase.priority === "critical" ? "var(--red-alert)" : "var(--text)" }}>
                      {ALERT_LABELS[activeCase.alertType] || activeCase.alertType}
                    </h3>
                    <span className="text-xs mono" style={{ color: "var(--muted)" }}>
                      ⏱ {timeAgo(activeCase.createdAt)} • Case #{activeCase.id.slice(0, 8)}
                    </span>
                  </div>
                </div>

                {activeCase.customer && (
                  <>
                    <div className="h-px my-3" style={{ background: "var(--border)" }} />
                    <div className="space-y-2">
                      <p className="text-xl font-semibold">
                        {activeCase.customer.firstName} {activeCase.customer.lastName}
                        {activeCase.customer.birthYear && <span className="text-sm ml-2" style={{ color: "var(--muted)" }}>*{activeCase.customer.birthYear}</span>}
                      </p>
                      <p className="mono text-sm" style={{ color: "var(--muted)" }}>
                        {activeCase.customer.address}
                        {activeCase.customer.floor && ` Kat:${activeCase.customer.floor}`}
                        {activeCase.customer.apartment && ` No:${activeCase.customer.apartment}`}
                      </p>
                      <p className="mono text-sm" style={{ color: "var(--muted)" }}>
                        {activeCase.customer.district && `${activeCase.customer.district}, `}{activeCase.customer.city}
                      </p>
                      <div className="h-px my-2" style={{ background: "var(--border)" }} />
                      <p className="mono">📱 {activeCase.customer.phoneMobile}</p>
                      {activeCase.customer.phoneHome && <p className="mono text-sm" style={{ color: "var(--muted)" }}>🏠 {activeCase.customer.phoneHome}</p>}
                      <p className="text-sm">Paket: <span className="font-semibold" style={{ color: "var(--gold)" }}>{BUNDLE_LABELS[activeCase.customer.bundle] || activeCase.customer.bundle}</span></p>
                      <p className="text-sm">Sprache: {LANG_FLAGS[activeCase.customer.language]} {activeCase.customer.language?.toUpperCase()}</p>
                      {activeCase.customer.medicalNotes && (
                        <p className="text-sm p-2 rounded" style={{ background: "rgba(255,170,0,0.1)", color: "var(--yellow-warn)" }}>
                          ⚕️ {activeCase.customer.medicalNotes}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {activeCase.contacts && activeCase.contacts.length > 0 && (
                  <>
                    <div className="h-px my-3" style={{ background: "var(--border)" }} />
                    <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>Notfallkontakte</p>
                    {activeCase.contacts.map((contact: any) => (
                      <div key={contact.id} className="flex items-center justify-between py-1">
                        <span className="text-sm">{contact.priority}. {contact.name} <span className="mono text-xs" style={{ color: "var(--muted)" }}>{contact.phone}</span></span>
                        <button onClick={() => callContact(contact)} className="text-xs px-2 py-1 rounded" style={{ background: "rgba(232,160,32,0.2)", color: "var(--gold)" }}>Anrufen</button>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <button onClick={callCustomer} className="p-3 rounded-lg text-sm font-semibold" style={{ background: "rgba(0,212,106,0.15)", color: "var(--green-ok)", border: "1px solid rgba(0,212,106,0.3)" }}>
                  📞 Kunden anrufen
                </button>
                {activeCase.contacts?.slice(0, 2).map((c: any, i: number) => (
                  <button key={c.id} onClick={() => callContact(c)} className="p-3 rounded-lg text-sm font-semibold" style={{ background: "rgba(232,160,32,0.15)", color: "var(--gold)", border: "1px solid rgba(232,160,32,0.3)" }}>
                    👨‍👩‍👧 Kontakt {i + 1}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <button onClick={() => updateCase({ notes: (notes ? notes + "\n" : "") + "✓ 112 informiert" })} className="p-2 rounded-lg text-xs font-medium" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  🚑 112 Informiert
                </button>
                <button onClick={() => updateCase({ status: "false_alarm", resolutionNote: "Fehlalarm" })} className="p-2 rounded-lg text-xs font-medium" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  ✅ Fehlalarm
                </button>
                <button onClick={() => updateCase({ status: "resolved", resolutionNote: notes })} className="p-2 rounded-lg text-xs font-medium" style={{ background: "rgba(0,212,106,0.15)", color: "var(--green-ok)", border: "1px solid rgba(0,212,106,0.3)" }}>
                  ✓ Case schließen
                </button>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Notizen</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full mt-2 p-3 rounded-lg text-sm mono outline-none resize-none"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                  placeholder="Notizen zum Vorfall..."
                />
                <p className="text-[10px] mt-1" style={{ color: "var(--muted)" }}>Auto-Save alle 5 Sek.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p style={{ color: "var(--muted)" }}>Alarm auswählen oder auf neuen Alarm warten</p>
            </div>
          )}
        </div>

        {/* Right: Map + Devices */}
        <div className="col-span-4 overflow-y-auto">
          {/* Map placeholder */}
          <div className="p-4">
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)", height: "280px" }}>
              {activeCase?.customer && (activeCase as any).gpsLat ? (
                <iframe
                  className="w-full h-full border-0"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${(activeCase as any).gpsLng - 0.01}%2C${(activeCase as any).gpsLat - 0.01}%2C${(activeCase as any).gpsLng + 0.01}%2C${(activeCase as any).gpsLat + 0.01}&layer=mapnik&marker=${(activeCase as any).gpsLat}%2C${(activeCase as any).gpsLng}`}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm" style={{ color: "var(--muted)" }}>📍 Kein GPS-Signal</p>
                </div>
              )}
            </div>
          </div>

          {/* Device Status */}
          <div className="p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--muted)" }}>
              Gerätestatus
            </h3>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: "var(--surface)" }}>
                    <th className="text-left p-2 font-medium" style={{ color: "var(--muted)" }}>Kunde</th>
                    <th className="text-center p-2 font-medium" style={{ color: "var(--muted)" }}>Hub</th>
                    <th className="text-center p-2 font-medium" style={{ color: "var(--muted)" }}>Mobil</th>
                    <th className="text-center p-2 font-medium" style={{ color: "var(--muted)" }}>Akku</th>
                    <th className="text-right p-2 font-medium" style={{ color: "var(--muted)" }}>Ping</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((d) => (
                    <tr key={d.customerId} style={{ borderTop: "1px solid var(--border)" }}>
                      <td className="p-2 font-medium">{d.customerName}</td>
                      <td className="text-center p-2">{d.hub ? (d.hub.status === "online" ? "🟢" : d.hub.status === "low_battery" ? "🟡" : "🔴") : "—"}</td>
                      <td className="text-center p-2">{d.mobile ? (d.mobile.status === "online" ? "🟢" : d.mobile.status === "low_battery" ? "🟡" : "🔴") : "—"}</td>
                      <td className="text-center p-2 mono">{d.mobile?.battery ?? d.hub?.battery ?? "—"}%</td>
                      <td className="text-right p-2 mono" style={{ color: "var(--muted)" }}>{d.hub?.lastSeen ? timeAgo(d.hub.lastSeen) : d.mobile?.lastSeen ? timeAgo(d.mobile.lastSeen) : "—"}</td>
                    </tr>
                  ))}
                  {devices.length === 0 && (
                    <tr><td colSpan={5} className="p-4 text-center" style={{ color: "var(--muted)" }}>Keine Geräte registriert</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
