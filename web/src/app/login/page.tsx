"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { api, saveTokens } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const tokens = await api.login(email, password);
      saveTokens(tokens);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-navy lg:grid-cols-[0.9fr_1.1fr]">
      <section className="flex min-h-[360px] flex-col justify-between px-6 py-8 text-white sm:px-10 lg:min-h-screen">
        <div>
          <div className="text-lg font-semibold tracking-wide">RestaurantOS</div>
          <div className="mt-1 text-sm text-white/62">Digital Systems for real businesses.</div>
        </div>
        <div className="max-w-md">
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            Control diario de presencia para restaurantes reales.
          </h1>
          <p className="mt-5 text-base leading-7 text-white/70">
            Fichajes móviles, kiosk con PIN y exportación mensual para gestoría.
            Simple de usar, serio de verdad.
          </p>
        </div>
        <div className="text-xs text-white/45">Studio32</div>
      </section>

      <section className="flex items-center justify-center bg-bg px-5 py-10">
        <form
          onSubmit={submit}
          className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 shadow-panel"
        >
          <div>
            <h2 className="text-xl font-semibold text-ink">Entrar al panel</h2>
            <p className="mt-1 text-sm text-muted">Accede con tu cuenta de manager.</p>
          </div>

          <label className="mt-6 block text-sm font-medium text-ink">
            Email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-border px-3 text-sm outline-none"
              type="email"
              autoComplete="email"
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-ink">
            Contraseña
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-border px-3 text-sm outline-none"
              type="password"
              autoComplete="current-password"
            />
          </label>

          {error ? (
            <div className="mt-4 rounded-md border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 h-11 w-full rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}
