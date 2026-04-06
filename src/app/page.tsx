"use client";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try { await login(email, password); } catch (err: any) { setError(err.message || "Login fehlgeschlagen"); } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0A0A0F" }}>
      <div style={{ width: "100%", maxWidth: 420, padding: 40, borderRadius: 16, background: "#12131A", border: "1px solid #1E2030" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#FF3B3B" strokeWidth="2"/><line x1="12" y1="8" x2="12" y2="13" stroke="#FF3B3B" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="16" r="1" fill="#FF3B3B"/></svg>
            <span style={{ fontSize: 20, fontWeight: 800, color: "#E8EAED", letterSpacing: 1 }}>NOTRUF24 LEITSTELLE</span>
          </div>
          <p style={{ fontSize: 13, color: "#6B7280" }}>Operator-Zugang</p>
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {error && <div style={{ padding: 12, borderRadius: 8, background: "rgba(255,59,59,0.1)", border: "1px solid rgba(255,59,59,0.3)", color: "#FF3B3B", fontSize: 13 }}>{error}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: 1 }}>E-Mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="operator@notra24.com" style={{ background: "#0A0A0F", border: "1px solid #1E2030", borderRadius: 8, padding: "12px 16px", fontSize: 14, color: "#E8EAED", outline: "none", fontFamily: "Inter" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: 1 }}>Passwort</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" style={{ background: "#0A0A0F", border: "1px solid #1E2030", borderRadius: 8, padding: "12px 16px", fontSize: 14, color: "#E8EAED", outline: "none", fontFamily: "Inter" }} />
          </div>
          <button type="submit" disabled={loading} style={{ background: loading ? "#1E2030" : "#FF3B3B", color: "#fff", padding: "14px", borderRadius: 8, fontSize: 14, fontWeight: 700, border: "none", cursor: loading ? "not-allowed" : "pointer", textTransform: "uppercase", letterSpacing: 1 }}>{loading ? "Anmelden..." : "Anmelden"}</button>
        </form>
      </div>
    </div>
  );
}
