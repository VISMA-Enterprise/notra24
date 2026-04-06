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
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Login fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-md p-8 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--gold)" }}>
            NOTRA 24
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
            Notdienst-Leitstelle
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 rounded text-sm" style={{ background: "rgba(255,32,32,0.1)", color: "var(--red-alert)", border: "1px solid rgba(255,32,32,0.3)" }}>
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>
              E-Mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg text-sm mono outline-none transition-colors"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
              placeholder="operator@notra24.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>
              Passwort
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg text-sm mono outline-none transition-colors"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-semibold text-sm uppercase tracking-wider transition-all"
            style={{
              background: loading ? "var(--border)" : "var(--gold)",
              color: "#080c14",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Anmelden..." : "Anmelden"}
          </button>
        </form>
      </div>
    </div>
  );
}
