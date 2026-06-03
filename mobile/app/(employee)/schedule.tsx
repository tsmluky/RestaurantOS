import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft, ChevronRight, MapPin, Calendar } from "lucide-react-native";

import { getMyShiftsRange, type Shift } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { colors } from "@/lib/colors";
import { formatTimeRange, isSameDay } from "@/lib/format";

// ── Calendar helpers ──────────────────────────────────────────────────────────

const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const DAY_NAMES = [
  "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo",
];

function buildCalendarGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let offset = firstDay.getDay() - 1;
  if (offset < 0) offset = 6;
  const grid: (Date | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    grid.push(new Date(year, month, d));
  }
  while (grid.length % 7 !== 0) grid.push(null);
  return grid;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function daysInMonth(year: number, month: number): Date[] {
  const last = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: last }, (_, i) => new Date(year, month, i + 1));
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatDayHeader(date: Date): string {
  const wd = DAY_NAMES[(date.getDay() + 6) % 7];
  return `${wd} ${date.getDate()} de ${MONTH_NAMES[date.getMonth()].toLowerCase()}`;
}

// ── Month calendar ────────────────────────────────────────────────────────────

function MonthCalendar({
  year,
  month,
  shiftDays,
  selectedDay,
  onSelectDay,
}: {
  year: number;
  month: number;
  shiftDays: Set<string>;
  selectedDay: Date | null;
  onSelectDay: (d: Date) => void;
}) {
  const today = new Date();
  const grid = useMemo(() => buildCalendarGrid(year, month), [year, month]);
  const weeks = useMemo(() => chunk(grid, 7), [grid]);

  return (
    <View style={cal.container}>
      <View style={cal.headerRow}>
        {WEEKDAY_LABELS.map((lbl) => (
          <View key={lbl} style={cal.headerCell}>
            <Text style={cal.headerText}>{lbl}</Text>
          </View>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={cal.row}>
          {week.map((date, di) => {
            if (!date) return <View key={di} style={cal.cell} />;
            const k = dayKey(date);
            const hasShift = shiftDays.has(k);
            const isToday = isSameDay(date, today);
            const isSelected = selectedDay ? isSameDay(date, selectedDay) : false;
            return (
              <Pressable
                key={di}
                style={({ pressed }) => [
                  cal.cell,
                  isSelected && cal.cellSelected,
                  isToday && !isSelected && cal.cellToday,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => onSelectDay(date)}
                hitSlop={2}
              >
                <Text
                  style={[
                    cal.dayNum,
                    isToday && !isSelected && cal.dayToday,
                    isSelected && cal.daySelected,
                  ]}
                >
                  {date.getDate()}
                </Text>
                {hasShift && (
                  <View style={[cal.dot, isSelected && cal.dotSelected]} />
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const cal = StyleSheet.create({
  container: { paddingHorizontal: 8, paddingBottom: 8 },
  headerRow: { flexDirection: "row", marginBottom: 4 },
  headerCell: { flex: 1, alignItems: "center", paddingVertical: 4 },
  headerText: { fontSize: 12, fontWeight: "700", color: colors.textTertiary },
  row: { flexDirection: "row" },
  cell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    gap: 3,
    borderRadius: 8,
  },
  cellSelected: { backgroundColor: colors.primary },
  cellToday: { backgroundColor: colors.primaryLight },
  dayNum: { fontSize: 14, fontWeight: "500", color: colors.text },
  dayToday: { color: colors.primary, fontWeight: "700" },
  daySelected: { color: "#fff", fontWeight: "700" },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.primary },
  dotSelected: { backgroundColor: "rgba(255,255,255,0.85)" },
});

// ── Shift block ───────────────────────────────────────────────────────────────

function ShiftBlock({
  shift,
  onPress,
}: {
  shift: Shift;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [blk.wrap, pressed && { opacity: 0.7 }]}
    >
      <View style={blk.bar} />
      <View style={blk.content}>
        <Text style={blk.time}>
          {formatTimeRange(shift.starts_at, shift.ends_at)}
        </Text>
        <View style={blk.metaRow}>
          <MapPin size={12} stroke={colors.textTertiary} />
          <Text style={blk.meta} numberOfLines={1}>
            {shift.restaurant_name ?? "—"}
          </Text>
          {shift.role ? <Text style={blk.role}> · {shift.role}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

const blk = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: 8,
  },
  bar: { width: 4, backgroundColor: colors.primary },
  content: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 4 },
  time: { fontSize: 15, fontWeight: "700", color: colors.text },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  meta: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  role: { fontSize: 12, color: colors.textTertiary },
});

// ── Schedule screen ───────────────────────────────────────────────────────────

export default function ScheduleScreen() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  const today = useMemo(() => new Date(), []);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<Date | null>(today);

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMonth = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const from = new Date(viewYear, viewMonth, 1);
      const to = new Date(viewYear, viewMonth + 1, 1);
      const data = await getMyShiftsRange(token, from, to);
      setShifts(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar el horario.");
    } finally {
      setLoading(false);
    }
  }, [token, viewYear, viewMonth]);

  useEffect(() => {
    void fetchMonth();
  }, [fetchMonth]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMonth();
    setRefreshing(false);
  }, [fetchMonth]);

  const shiftDayKeys = useMemo(() => {
    const s = new Set<string>();
    for (const sh of shifts) s.add(dayKey(new Date(sh.starts_at)));
    return s;
  }, [shifts]);

  const shiftsByDay = useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const sh of shifts) {
      const k = dayKey(new Date(sh.starts_at));
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(sh);
    }
    return map;
  }, [shifts]);

  const listDays = useMemo(() => {
    if (selectedDay) return [selectedDay];
    return daysInMonth(viewYear, viewMonth).filter((d) =>
      shiftDayKeys.has(dayKey(d))
    );
  }, [selectedDay, viewYear, viewMonth, shiftDayKeys]);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
    setSelectedDay(null);
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
    setSelectedDay(null);
  }

  function handleSelectDay(d: Date) {
    if (selectedDay && isSameDay(d, selectedDay)) setSelectedDay(null);
    else setSelectedDay(d);
  }

  const isCurrentMonth =
    viewYear === today.getFullYear() && viewMonth === today.getMonth();

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Navy header ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Calendario</Text>
          {!isCurrentMonth && (
            <Pressable
              onPress={() => {
                setViewYear(today.getFullYear());
                setViewMonth(today.getMonth());
                setSelectedDay(today);
              }}
              hitSlop={8}
              style={({ pressed }) => [styles.todayBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.todayBtnText}>Hoy</Text>
            </Pressable>
          )}
        </View>
        <View style={styles.monthNav}>
          <Pressable
            onPress={prevMonth}
            hitSlop={10}
            style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.6 }]}
          >
            <ChevronLeft size={20} stroke="#fff" />
          </Pressable>
          <Text style={styles.monthLabel}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </Text>
          <Pressable
            onPress={nextMonth}
            hitSlop={10}
            style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.6 }]}
          >
            <ChevronRight size={20} stroke="#fff" />
          </Pressable>
        </View>
      </View>

      {/* ── Body ── */}
      <View style={styles.body}>
        {/* Calendar card */}
        <View style={styles.calCard}>
          <MonthCalendar
            year={viewYear}
            month={viewMonth}
            shiftDays={shiftDayKeys}
            selectedDay={selectedDay}
            onSelectDay={handleSelectDay}
          />
        </View>

        {/* Shift list */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => void fetchMonth()} style={styles.retryBtn}>
              <Text style={styles.retryText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
          >
            {listDays.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Calendar size={40} stroke={colors.textTertiary} strokeWidth={1.5} />
                <Text style={styles.emptyText}>
                  {selectedDay ? "Sin turnos este día" : "Sin turnos este mes"}
                </Text>
                <Text style={styles.emptySubText}>
                  Tu manager publicará el horario aquí cuando esté listo.
                </Text>
              </View>
            ) : (
              listDays.map((day) => {
                const dayShifts = shiftsByDay.get(dayKey(day)) ?? [];
                return (
                  <View key={dayKey(day)} style={styles.daySection}>
                    <Text style={styles.dayHeader}>{formatDayHeader(day)}</Text>
                    {dayShifts.length === 0 ? (
                      <Text style={styles.noShiftText}>Sin turnos</Text>
                    ) : (
                      dayShifts.map((shift) => (
                        <ShiftBlock
                          key={shift.id}
                          shift={shift}
                          onPress={() =>
                            router.push({
                              pathname: "/(employee)/shift/[id]",
                              params: { id: shift.id },
                            })
                          }
                        />
                      ))
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.navy,
  },
  header: {
    backgroundColor: colors.navy,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
  },
  todayBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  todayBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  body: {
    flex: 1,
    backgroundColor: colors.background,
  },
  calCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 12,
    marginTop: -2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  daySection: {
    marginBottom: 20,
  },
  dayHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  noShiftText: {
    fontSize: 14,
    color: colors.textTertiary,
    fontStyle: "italic",
    paddingLeft: 4,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
  },
  emptyWrap: {
    paddingTop: 48,
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: 4,
  },
  emptySubText: {
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: "center",
    lineHeight: 19,
  },
  errorWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
  },
});
