"use client";

import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { api, saveTokens } from "@/lib/api";

type Phase = "verifying" | "set-password" | "success" | "error";

function MagicLinkContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [phase, setPhase] = useState<Phase>("verifying");
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const verified = useRef(false);

  // Auto-verify on mount (no password required — managers can set one later)
  useEffect(() => {
    if (!token || verified.current) return;
    verified.current = true;

    api
      .verifyMagicLink(token)
      .then((tokens) => {
        saveTokens(tokens);
        setPhase("success");
        setTimeout(() => router.replace("/dashboard"), 1500);
      })
      .catch(() => {
        // Token may be a first-time onboarding link that requires a password — let user choose
        setPhase("set-password");
      });
  }, [token, router]);

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const tokens = await api.verifyMagicLink(token, password);
      saveTokens(tokens);
      setPhase("success");
      setTimeout(() => router.replace("/dashboard"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enlace inválido o expirado");
      setPhase("error");
    } finally {
      setLoading(false);
    }
  }

  async function continueWithoutPassword() {
    setLoading(true);
    setError(null);
    try {
      const tokens = await api.verifyMagicLink(token);
      saveTokens(tokens);
      setPhase("success");
      setTimeout(() => router.replace("/dashboard"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enlace inválido o expirado");
      setPhase("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-5">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 shadow-panel">
        <div className="mb-6">
          <div className="text-lg font-semibold text-ink">RestaurantOS</div>
          <p className="mt-1 text-sm text-muted">Acceso seguro mediante enlace</p>
        </div>

        {phase === "verifying" && (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted">Verificando tu acceso...</p>
          </div>
        )}

        {phase === "set-password" && (
          <>
            <p className="mb-6 text-sm text-ink">
              Bienvenido/a. Puedes establecer una contraseña para acceder sin magic link en el
              futuro, o continuar directamente.
            </p>
            <form onSubmit={submitPassword} className="space-y-4">
              <label className="block text-sm font-medium text-ink">
                Nueva contraseña (opcional)
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 h-11 w-full rounded-md border border-border px-3 text-sm outline-none focus:border-primary"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                />
              </label>
              <label className="block text-sm font-medium text-ink">
                Confirmar contraseña
                <input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="mt-2 h-11 w-full rounded-md border border-border px-3 text-sm outline-none focus:border-primary"
                  type="password"
                  autoComplete="new-password"
                />
              </label>

              {error ? (
                <div className="rounded-md border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading || !password}
                className="h-11 w-full rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? "Entrando..." : "Establecer contraseña y entrar"}
              </button>
            </form>
            <button
              type="button"
              onClick={continueWithoutPassword}
              disabled={loading}
              className="mt-3 h-10 w-full rounded-md border border-border px-4 text-sm text-ink hover:bg-bg disabled:opacity-60"
            >
              Entrar sin contraseña
            </button>
          </>
        )}

        {phase === "success" && (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <svg className="h-6 w-6 text-success" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-ink">Acceso verificado</p>
            <p className="mt-1 text-xs text-muted">Redirigiendo al panel...</p>
          </div>
        )}

        {phase === "error" && (
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-danger">Enlace inválido o expirado</p>
            {error ? <p className="mt-1 text-xs text-muted">{error}</p> : null}
            <button
              type="button"
              onClick={() => router.replace("/login")}
              className="mt-6 h-10 rounded-md bg-primary px-6 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Ir al login
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

export default function MagicLinkPage() {
  return (
    <Suspense>
      <MagicLinkContent />
    </Suspense>
  );
}
