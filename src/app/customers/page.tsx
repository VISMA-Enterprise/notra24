"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

const BUNDLE_OPTIONS = [
  { value: "safe_home", label: "Safe Home" },
  { value: "safe_life", label: "Safe Life" },
  { value: "safe_home_plus", label: "Safe Home+" },
];
const LANG_OPTIONS = [
  { value: "de", label: "🇩🇪 Deutsch" },
  { value: "tr", label: "🇹🇷 Türkçe" },
  { value: "en", label: "🇬🇧 English" },
  { value: "ru", label: "🇷🇺 Русский" },
];
const STATUS_COLORS: Record<string, string> = { active: "var(--green-ok)", inactive: "var(--muted)", suspended: "var(--yellow-warn)" };

export default function CustomersPage() {
  const { operator, authFetch, logout, loading } = useAuth();
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterBundle, setFilterBundle] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (!loading && !operator) router.push("/");
  }, [operator, loading]);

  useEffect(() => { loadCustomers(); }, [search, filterStatus, filterBundle, pagination.page]);

  const loadCustomers = async () => {
    try {
      const params = new URLSearchParams({ page: String(pagination.page), limit: "25" });
      if (search) params.set("search", search);
      if (filterStatus) params.set("status", filterStatus);
      if (filterBundle) params.set("bundle", filterBundle);
      const res = await authFetch(`/api/customers?${params}`);
      if (res.success) { setCustomers(res.data); setPagination(res.pagination); }
    } catch {}
  };

  const saveCustomer = async () => {
    try {
      if (editCustomer) {
        await authFetch(`/api/customers/${editCustomer.id}`, { method: "PUT", body: JSON.stringify(form) });
      } else {
        await authFetch("/api/customers", { method: "POST", body: JSON.stringify(form) });
      }
      setShowModal(false);
      setEditCustomer(null);
      setForm({});
      loadCustomers();
    } catch {}
  };

  const openEdit = (c: any) => { setEditCustomer(c); setForm(c); setShowModal(true); };
  const openNew = () => { setEditCustomer(null); setForm({ city: "Antalya", language: "de", bundle: "safe_home" }); setShowModal(true); };

  if (loading || !operator) return null;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-4">
          <a href="/dashboard" className="text-lg font-bold" style={{ color: "var(--gold)" }}>NOTRA 24</a>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <a href="/dashboard" style={{ color: "var(--muted)" }}>Dashboard</a>
          <a href="/customers" className="font-medium" style={{ color: "var(--gold)" }}>Kunden</a>
          <a href="/cases" style={{ color: "var(--muted)" }}>Vorfälle</a>
          <a href="/status" style={{ color: "var(--muted)" }}>System</a>
          <button onClick={logout} className="text-xs" style={{ color: "var(--red-alert)" }}>Abmelden</button>
        </nav>
      </header>

      <div className="p-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Kundenverwaltung</h2>
          <button onClick={openNew} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "var(--gold)", color: "#080c14" }}>
            + Neuer Kunde
          </button>
        </div>

        <div className="flex gap-3 mb-4">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Suche..." className="px-3 py-2 rounded-lg text-sm flex-1 mono outline-none" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-lg text-sm" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
            <option value="">Alle Status</option>
            <option value="active">Aktiv</option>
            <option value="inactive">Inaktiv</option>
            <option value="suspended">Gesperrt</option>
          </select>
          <select value={filterBundle} onChange={(e) => setFilterBundle(e.target.value)} className="px-3 py-2 rounded-lg text-sm" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
            <option value="">Alle Pakete</option>
            {BUNDLE_OPTIONS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--surface)" }}>
                <th className="text-left p-3 font-medium" style={{ color: "var(--muted)" }}>Name</th>
                <th className="text-left p-3 font-medium" style={{ color: "var(--muted)" }}>Telefon</th>
                <th className="text-left p-3 font-medium" style={{ color: "var(--muted)" }}>Paket</th>
                <th className="text-left p-3 font-medium" style={{ color: "var(--muted)" }}>Status</th>
                <th className="text-left p-3 font-medium" style={{ color: "var(--muted)" }}>Sprache</th>
                <th className="text-right p-3 font-medium" style={{ color: "var(--muted)" }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="cursor-pointer hover:opacity-80" style={{ borderTop: "1px solid var(--border)" }} onClick={() => openEdit(c)}>
                  <td className="p-3 font-medium">{c.firstName} {c.lastName}</td>
                  <td className="p-3 mono" style={{ color: "var(--muted)" }}>{c.phoneMobile}</td>
                  <td className="p-3"><span className="text-xs px-2 py-1 rounded" style={{ background: "rgba(232,160,32,0.15)", color: "var(--gold)" }}>{c.bundle?.replace("_", " ").toUpperCase()}</span></td>
                  <td className="p-3"><span style={{ color: STATUS_COLORS[c.status] }}>● {c.status}</span></td>
                  <td className="p-3">{LANG_OPTIONS.find(l => l.value === c.language)?.label}</td>
                  <td className="p-3 text-right"><button className="text-xs" style={{ color: "var(--gold)" }}>Bearbeiten</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: pagination.totalPages }, (_, i) => (
              <button key={i} onClick={() => setPagination(p => ({ ...p, page: i + 1 }))} className="px-3 py-1 rounded text-xs" style={{ background: pagination.page === i + 1 ? "var(--gold)" : "var(--surface)", color: pagination.page === i + 1 ? "#080c14" : "var(--muted)" }}>
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h3 className="text-lg font-semibold mb-4">{editCustomer ? "Kunde bearbeiten" : "Neuer Kunde"}</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "firstName", label: "Vorname", required: true },
                { key: "lastName", label: "Nachname", required: true },
                { key: "phoneMobile", label: "Mobiltelefon", required: true },
                { key: "phoneHome", label: "Festnetz" },
                { key: "birthYear", label: "Geburtsjahr", type: "number" },
                { key: "address", label: "Adresse", required: true, span: 2 },
                { key: "floor", label: "Etage" },
                { key: "apartment", label: "Wohnung" },
                { key: "district", label: "Bezirk" },
                { key: "city", label: "Stadt" },
                { key: "deviceIdHub", label: "Hub Geräte-ID" },
                { key: "deviceIdMobile", label: "Mobil Geräte-ID" },
                { key: "monthlyFee", label: "Monatl. Gebühr", type: "number" },
                { key: "contractStart", label: "Vertragsbeginn", type: "date" },
              ].map(({ key, label, type, required, span }) => (
                <div key={key} className={span === 2 ? "col-span-2" : ""}>
                  <label className="text-xs" style={{ color: "var(--muted)" }}>{label}{required && " *"}</label>
                  <input value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} type={type || "text"} className="w-full px-3 py-2 rounded text-sm mono outline-none mt-1" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
                </div>
              ))}
              <div>
                <label className="text-xs" style={{ color: "var(--muted)" }}>Sprache</label>
                <select value={form.language || "de"} onChange={(e) => setForm({ ...form, language: e.target.value })} className="w-full px-3 py-2 rounded text-sm mt-1" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}>
                  {LANG_OPTIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs" style={{ color: "var(--muted)" }}>Paket *</label>
                <select value={form.bundle || "safe_home"} onChange={(e) => setForm({ ...form, bundle: e.target.value })} className="w-full px-3 py-2 rounded text-sm mt-1" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}>
                  {BUNDLE_OPTIONS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs" style={{ color: "var(--muted)" }}>Medizinische Notizen</label>
                <textarea value={form.medicalNotes || ""} onChange={(e) => setForm({ ...form, medicalNotes: e.target.value })} rows={2} className="w-full px-3 py-2 rounded text-sm mono outline-none mt-1" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
              </div>
              <div className="col-span-2">
                <label className="text-xs" style={{ color: "var(--muted)" }}>Notizen</label>
                <textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 rounded text-sm mono outline-none mt-1" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => { setShowModal(false); setEditCustomer(null); }} className="px-4 py-2 rounded-lg text-sm" style={{ border: "1px solid var(--border)", color: "var(--muted)" }}>Abbrechen</button>
              <button onClick={saveCustomer} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "var(--gold)", color: "#080c14" }}>Speichern</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
