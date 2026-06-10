"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { api, getAccessToken } from "@/lib/api";
import type { KioskClockResponse, Restaurant } from "@/lib/types";

const RESTAURANT_KEY = "restaurantos.kiosk_restaurant_id";
const RESET_MS = 4000;

type KioskState =
  | "loading"
  | "no_auth"
  | "pick_restaurant"
  | "idle"
  | "submitting"
  | "success"
  | "error";

function generateIdempotencyKey(): string {
  return `web-kiosk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

export default function KioskModePage() {
  const [state, setState] = useState<KioskState>("loading");
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [pin, setPin] = useState("");
  const [result, setResult] = useState<KioskClockResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [clock, setClock] = useState(() => new Date());
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000 * 30);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!getAccessToken()) {
      setState("no_auth");
      return;
    }
    api
      .restaurants()
      .then((list) => {
        setRestaurants(list);
        const savedId = window.localStorage.getItem(RESTAURANT_KEY);
        const saved = list.find((r) => r.id === savedId);
        if (saved) {
          setRestaurant(saved);
          setState("idle");
        } else if (list.length === 1) {
          setRestaurant(list[0]);
          window.localStorage.setItem(RESTAURANT_KEY, list[0].id);
          setState("idle");
        } else {
          setState("pick_restaurant");
        }
      })
      .catch(() => setState("no_auth"));
  }, []);

  const scheduleReset = useCallback(() => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => {
      setPin("");
      setResult(null);
      setErrorMsg("");
      setState("idle");
    }, RESET_MS);
  }, []);

  const submit = useCallback(
    async (currentPin: string) => {
      if (!restaurant || currentPin.length < 4) return;
      setState("submitting");
      try {
        const res = await api.kioskClock({
          restaurant_id: restaurant.id,
          employee_pin: currentPin,
          idempotency_key: generateIdempotencyKey()
        });
        setResult(res);
        setState("success");
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        setErrorMsg(
          message && !message.startsWith("Error ")
            ? message
            : "No se pudo conectar. Comprueba la red e inténtalo otra vez."
        );
        setState("error");
      } finally {
        scheduleReset();
      }
    },
    [restaurant, scheduleReset]
  );

  const pressKey = useCallback(
    (key: string) => {
      if (state !== "idle") return;
      if (key === "back") {
        setPin((p) => p.slice(0, -1));
        return;
      }
      setPin((p) => {
        if (p.length >= 6) return p;
        return p + key;
      });
    },
    [state]
  );

  function chooseRestaurant(r: Restaurant) {
    setRestaurant(r);
    window.localStorage.setItem(RESTAURANT_KEY, r.id);
    setState("idle");
  }

  if (state === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <p className="text-lg">Cargando kiosk…</p>
      </main>
    );
  }

  if (state === "no_auth") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-900 px-6 text-center text-white">
        <h1 className="text-2xl font-bold">Kiosk sin sesión</h1>
        <p className="max-w-md text-slate-300">
          Para activar el kiosk, un manager debe iniciar sesión primero en este dispositivo.
        </p>
        <a
          href="/login"
          className="rounded-md bg-blue-600 px-6 py-3 text-base font-semibold text-white"
        >
          Ir al login
        </a>
      </main>
    );
  }

  if (state === "pick_restaurant") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-900 px-6 text-white">
        <h1 className="text-2xl font-bold">Selecciona la sucursal de este kiosk</h1>
        <div className="grid w-full max-w-md gap-3">
          {restaurants.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => chooseRestaurant(r)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-6 py-4 text-left text-lg font-semibold hover:bg-slate-700"
            >
              {r.name}
              {r.address ? <span className="block text-sm font-normal text-slate-400">{r.address}</span> : null}
            </button>
          ))}
        </div>
      </main>
    );
  }

  const isSuccess = state === "success" && result;
  const isError = state === "error";

  return (
    <main className="flex min-h-screen flex-col items-center justify-between bg-slate-900 px-6 py-8 text-white">
      <header className="flex w-full max-w-md items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-400">RestaurantOS · Kiosk</p>
          <h1 className="text-xl font-bold">{restaurant?.name}</h1>
        </div>
        <p className="text-2xl font-semibold tabular-nums">
          {clock.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </header>

      <section className="flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6">
        {isSuccess ? (
          <div
            className={`w-full rounded-2xl p-8 text-center ${
              result.status === "CLOCKED_IN" ? "bg-emerald-600" : "bg-blue-600"
            }`}
          >
            <p className="text-3xl font-bold">{result.employee_name}</p>
            <p className="mt-2 text-xl">
              {result.status === "CLOCKED_IN" ? "Entrada registrada" : "Salida registrada"} ·{" "}
              {formatTime(result.event_at)}
            </p>
            {result.status === "CLOCKED_OUT" && result.duration_minutes != null ? (
              <p className="mt-1 text-slate-100">
                Sesión: {Math.floor(result.duration_minutes / 60)}h {result.duration_minutes % 60}min
              </p>
            ) : null}
          </div>
        ) : isError ? (
          <div className="w-full rounded-2xl bg-red-600 p-8 text-center">
            <p className="text-2xl font-bold">No se pudo fichar</p>
            <p className="mt-2 text-lg">{errorMsg}</p>
          </div>
        ) : (
          <>
            <p className="text-lg text-slate-300">Introduce tu PIN para fichar</p>
            <div className="flex gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <span
                  key={i}
                  className={`h-4 w-4 rounded-full ${
                    i < pin.length ? "bg-white" : "border border-slate-600"
                  }`}
                />
              ))}
            </div>
            <div className="grid w-full grid-cols-3 gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "back", "0", "ok"].map((key) => {
                if (key === "ok") {
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={pin.length < 4 || state === "submitting"}
                      onClick={() => void submit(pin)}
                      className="h-20 rounded-xl bg-blue-600 text-xl font-bold disabled:opacity-40"
                    >
                      {state === "submitting" ? "…" : "Fichar"}
                    </button>
                  );
                }
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => pressKey(key)}
                    className="h-20 rounded-xl border border-slate-700 bg-slate-800 text-2xl font-semibold hover:bg-slate-700 active:bg-slate-600"
                  >
                    {key === "back" ? "⌫" : key}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>

      <footer className="text-sm text-slate-500">
        La tablet decide entrada o salida automáticamente · Studio32
      </footer>
    </main>
  );
}
