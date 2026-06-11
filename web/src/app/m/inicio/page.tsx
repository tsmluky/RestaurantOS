"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CalendarDays, Clock, LogIn, LogOut } from "lucide-react";

import { api } from "@/lib/api";
import type { ClockStatus, Shift } from "@/lib/types";
import { useMobileUser } from "@/components/mobile/mobile-shell";
import {
  fmtTime,
  fmtTimeRange,
  fmtTimer,
  getLocationFast,
  greeting,
  idemKey,
  monthShort,
  weekdayShort
} from "@/components/mobile/mobile-format";

function ShiftCard({ shift }: { shift: Shift }) {
  const start = new Date(shift.starts_at);
  return (
    <div className="m-card m-shift-card">
      <div className="m-shift-date">
        <span className="wd">{weekdayShort(start).toUpperCase()}</span>
        <span className="dn">{start.getDate()}</span>
        <span className="mo">{monthShort(start).toUpperCase()}</span>
      </div>
      <div className="m-shift-body">
        <div className="m-shift-time">{fmtTimeRange(shift.starts_at, shift.ends_at)}</div>
        <div className="m-shift-place">{shift.restaurant_name ?? "—"}</div>
        {shift.role ? <div className="m-shift-role">{shift.role}</div> : null}
      </div>
    </div>
  );
}

export default function EmployeeHomePage() {
  const user = useMobileUser();
  const [status, setStatus] = useState<ClockStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [clocking, setClocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upcoming, setUpcoming] = useState<Shift[]>([]);
  const [gpsOk, setGpsOk] = useState<boolean | null>(null);
  const [tick, setTick] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isClockedIn = status?.status === "CLOCKED_IN";

  const fetchStatus = useCallback(async () => {
    try {
      const s = await api.clockStatus();
      setStatus(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar estado.");
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
    api
      .myUpcomingShifts(6)
      .then((r) => setUpcoming(r.items))
      .catch(() => {});
  }, [fetchStatus]);

  // Cronómetro en vivo
  useEffect(() => {
    if (isClockedIn && status?.clock_in_at) {
      tickRef.current = setInterval(() => setTick((t) => t + 1), 1000);
      return () => {
        if (tickRef.current) clearInterval(tickRef.current);
      };
    }
  }, [isClockedIn, status?.clock_in_at]);

  const elapsedSec =
    isClockedIn && status?.clock_in_at
      ? Math.max(0, (Date.now() - new Date(status.clock_in_at).getTime()) / 1000)
      : 0;

  async function handleClock() {
    if (!user) return;
    setError(null);
    const restaurantId = status?.restaurant_id ?? user.primary_restaurant_id;
    if (!restaurantId) {
      setError("Tu cuenta no tiene una sucursal asignada. Avísale a tu manager.");
      return;
    }
    setClocking(true);
    try {
      // No bloquear el fichaje esperando al GPS: 3,5s máximo.
      const loc = await getLocationFast();
      setGpsOk(!!loc);
      const payload = {
        restaurant_id: restaurantId,
        verification_method: loc ? ("GPS" as const) : ("NONE" as const),
        idempotency_key: idemKey(),
        ...(loc ?? {})
      };
      if (isClockedIn) {
        await api.clockOut(payload);
      } else {
        await api.clockIn(payload);
      }
      await fetchStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al fichar.");
    } finally {
      setClocking(false);
    }
  }

  const firstName = user?.full_name?.split(" ")[0] ?? "—";
  void tick;

  return (
    <div className="m-screen">
      <header className="m-nav-header">
        <div className="top">
          <span className="m-greet">{greeting()}</span>
          <span className="m-bell">
            <Bell size={20} strokeWidth={2} />
          </span>
        </div>
        <div className="m-uname">{firstName}</div>
        <div className={`m-hsub${isClockedIn ? " in" : ""}`}>
          {isClockedIn
            ? `● Dentro desde las ${fmtTime(status?.clock_in_at)}`
            : upcoming.length > 0
              ? `${upcoming.length} turno${upcoming.length > 1 ? "s" : ""} próximo${upcoming.length > 1 ? "s" : ""}`
              : "Sin turno programado hoy"}
        </div>
      </header>

      <div className="m-card m-shadow m-clock-hero">
        {loadingStatus ? (
          <div className="m-spinner" style={{ margin: "40px 0" }} />
        ) : (
          <>
            {isClockedIn ? (
              <div>
                <div className="m-timer">{fmtTimer(elapsedSec)}</div>
                <div className="m-timer-lbl">Tiempo trabajado</div>
              </div>
            ) : null}
            <button
              className={`m-btn-circle ${isClockedIn ? "out" : "in"}`}
              onClick={handleClock}
              disabled={clocking}
            >
              {clocking ? (
                <span className="m-spinner white" />
              ) : isClockedIn ? (
                <>
                  <LogOut size={34} strokeWidth={2.2} />
                  SALIR
                </>
              ) : (
                <>
                  <LogIn size={34} strokeWidth={2.2} />
                  ENTRAR
                </>
              )}
            </button>
            <div className="m-clock-meta">
              <span className={`m-gps-dot${gpsOk === false ? " off" : ""}`} />
              {isClockedIn
                ? `Entrada ${fmtTime(status?.clock_in_at)}${gpsOk === false ? " · sin ubicación" : " · GPS"}`
                : gpsOk === false
                  ? "Listo para fichar · sin ubicación"
                  : "Listo para fichar"}
            </div>
          </>
        )}
      </div>

      {error ? <div className="m-error">{error}</div> : null}

      <section className="m-sec">
        <div className="m-sec-h">
          <span className="m-sec-t">Próximos turnos</span>
          <Link className="m-sec-link" href="/m/turnos">
            Ver todos
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <div className="m-card m-empty">
            <CalendarDays size={30} strokeWidth={1.5} color="#94A3B8" />
            <b>Sin turnos asignados</b>
            <span>Tu manager publicará el horario aquí cuando esté listo.</span>
          </div>
        ) : (
          <div className="m-shift-row">
            {upcoming.map((s) => (
              <ShiftCard key={s.id} shift={s} />
            ))}
          </div>
        )}
      </section>

      <section className="m-sec" style={{ paddingBottom: 24 }}>
        <div className="m-sec-h">
          <span className="m-sec-t">Acciones rápidas</span>
        </div>
        <div className="m-grid-2">
          <Link href="/m/registros" className="m-card m-action">
            <span className="m-ic" style={{ background: "var(--m-primary-light)" }}>
              <Clock size={22} strokeWidth={2} color="#2563EB" />
            </span>
            <b>Mis registros</b>
            <span>Historial de fichajes</span>
          </Link>
          <Link href="/m/turnos" className="m-card m-action">
            <span className="m-ic" style={{ background: "var(--m-warning-light)" }}>
              <CalendarDays size={22} strokeWidth={2} color="#D97706" />
            </span>
            <b>Mis turnos</b>
            <span>Horario publicado</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
