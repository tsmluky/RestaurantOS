"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChefHat } from "lucide-react";

import { api, saveTokens } from "@/lib/api";
import { isManagerRole } from "@/components/mobile/mobile-shell";

export default function MobileLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Introduce tu email y contraseña.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const tokens = await api.login(email.trim(), password);
      saveTokens(tokens);
      const me = await api.me();
      router.replace(isManagerRole(me.role) ? "/m/live" : "/m/inicio");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al iniciar sesión.";
      setError(/credencial|401|incorrect/i.test(msg) ? "Email o contraseña incorrectos." : msg);
      setLoading(false);
    }
  }

  return (
    <div className="m-screen no-tabs">
      <div className="m-login">
        <div className="m-logo-wrap">
          <div className="m-logo">
            <ChefHat size={42} strokeWidth={1.8} />
          </div>
          <div className="m-appname">RestaurantOS</div>
          <div className="m-tagline">Control de horarios para tu equipo</div>
        </div>

        <form className="m-login-card" onSubmit={handleSubmit}>
          {error ? <div className="m-login-err">{error}</div> : null}
          <div className="m-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              className="m-input"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="m-field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              className="m-input"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          <button className="m-btn m-btn-primary" type="submit" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? <span className="m-spinner white" style={{ width: 20, height: 20, borderWidth: 2.5 }} /> : "Entrar"}
          </button>
        </form>

        <div className="m-kiosk-link">
          ¿Tablet del local? <Link href="/kiosk-mode">Configurar modo kiosk</Link>
        </div>
      </div>
    </div>
  );
}
