/**
 * Formatea minutos trabajados como "8h 30min" o "45min"
 */
export function formatElapsed(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

/**
 * Saludo según hora del día
 */
export function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

/**
 * Fecha larga en español: "lunes, 12 de mayo"
 */
export function formatDateLong(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/**
 * Fecha corta en español: "12 may"
 */
export function formatDateShort(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });
}

/**
 * Hora en formato HH:MM
 */
export function formatTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Etiqueta de estado en español
 */
export function statusLabel(
  status: "OFF_DUTY" | "CLOCKED_IN" | "MISSING_CLOCK_OUT" | "NEEDS_REVIEW"
): string {
  const map = {
    OFF_DUTY: "Sin turno activo",
    CLOCKED_IN: "Turno activo",
    MISSING_CLOCK_OUT: "Falta salida",
    NEEDS_REVIEW: "Revisar",
  };
  return map[status] ?? status;
}

/**
 * "Hoy" / "Mañana" / nombre del día de la semana / fecha corta.
 * Útil para tarjetas de próximos turnos.
 */
export function formatDayLabel(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Mañana";
  if (diffDays === -1) return "Ayer";
  if (diffDays > 1 && diffDays < 7) {
    return d.toLocaleDateString("es-ES", { weekday: "long" });
  }
  return d.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/**
 * Día del mes con 2 dígitos: "20"
 */
export function formatDayNumber(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.getDate().toString().padStart(2, "0");
}

/**
 * Nombre corto del mes: "may"
 */
export function formatMonthShort(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-ES", { month: "short" });
}

/**
 * Nombre corto del día: "lun", "mar"
 */
export function formatWeekdayShort(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-ES", { weekday: "short" });
}

/**
 * Día del mes (sin padding): "20"
 */
export function formatDayMonth(date: string | Date): number {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.getDate();
}

/**
 * Rango horario "12:00 - 16:00"
 */
export function formatTimeRange(start: string | Date, end: string | Date): string {
  return `${formatTime(start)} - ${formatTime(end)}`;
}

/**
 * Devuelve el lunes (00:00 local) de la semana que contiene la fecha dada.
 */
export function startOfWeek(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun ... 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

/**
 * Devuelve un array de los 7 días (Date) de la semana que empieza en `monday`.
 */
export function weekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

/**
 * ¿Son el mismo día (local)?
 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
