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
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react-native";

import { getMyShiftsRange, type Shift } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { colors } from "@/lib/colors";
import {
  formatTimeRange,
  formatDayNumber,
  formatWeekdayShort,
  isSameDay,
  startOfWeek,
  weekDays,
} from "@/lib/format";

export default function ScheduleScreen() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    return d;
  }, [weekStart]);

  const fetchWeek = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getMyShiftsRange(token, weekStart, weekEnd);
      setShifts(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar el horario.");
    } finally {
      setLoading(false);
    }
  }, [token, weekStart, weekEnd]);

  useEffect(() => {
    void fetchWeek();
  }, [fetchWeek]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchWeek();
    setRefreshing(false);
  }, [fetchWeek]);

  const shiftsByDay = useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const s of shifts) {
      const d = new Date(s.starts_at);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString();
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return map;
  }, [shifts]);

  const weekLabel = useMemo(() => {
    const start = weekStart.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });
    const end = new Date(weekEnd);
    end.setDate(end.getDate() - 1);
    const endLabel = end.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });
    return `${start} – ${endLabel}`;
  }, [weekStart, weekEnd]);

  function shiftWeek(deltaDays: number) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + deltaDays);
    setWeekStart(d);
  }

  const isCurrentWeek = isSameDay(weekStart, startOfWeek());
  const totalMinutes = shifts.reduce((acc, s) => acc + s.duration_minutes, 0);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerBar}>
        <Text style={styles.title}>Mi horario</Text>
        {!isCurrentWeek && (
          <Pressable
            onPress={() => setWeekStart(startOfWeek())}
            hitSlop={8}
            style={({ pressed }) => [styles.todayBtn, pressed && styles.pressed]}
          >
            <Text style={styles.todayBtnText}>Hoy</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.weekNav}>
        <Pressable
          onPress={() => shiftWeek(-7)}
          hitSlop={10}
          style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
        >
          <ChevronLeft size={22} stroke={colors.text} />
        </Pressable>
        <View style={styles.weekLabelBox}>
          <Text style={styles.weekLabel}>{weekLabel}</Text>
          <Text style={styles.weekSubLabel}>
            {Math.round((totalMinutes / 60) * 10) / 10} h programadas
          </Text>
        </View>
        <Pressable
          onPress={() => shiftWeek(7)}
          hitSlop={10}
          style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
        >
          <ChevronRight size={22} stroke={colors.text} />
        </Pressable>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {loading && shifts.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          days.map((day) => {
            const key = day.toISOString();
            const daySh = shiftsByDay.get(key) ?? [];
            const isToday = isSameDay(day, new Date());
            return (
              <View
                key={key}
                style={[styles.dayRow, isToday && styles.dayRowToday]}
              >
                <View style={styles.dayHeader}>
                  <Text
                    style={[
                      styles.dayWeekday,
                      isToday && styles.todayHighlight,
                    ]}
                  >
                    {formatWeekdayShort(day)}
                  </Text>
                  <Text
                    style={[
                      styles.dayNumber,
                      isToday && styles.todayHighlight,
                    ]}
                  >
                    {formatDayNumber(day)}
                  </Text>
                </View>

                <View style={styles.dayShifts}>
                  {daySh.length === 0 ? (
                    <View style={styles.dayOff}>
                      <Text style={styles.dayOffText}>Día libre</Text>
                    </View>
                  ) : (
                    daySh.map((s) => (
                      <Pressable
                        key={s.id}
                        onPress={() =>
                          router.push({
                            pathname: "/(employee)/shift/[id]",
                            params: { id: s.id },
                          })
                        }
                        style={({ pressed }) => [
                          styles.shiftBlock,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text style={styles.shiftTime}>
                          {formatTimeRange(s.starts_at, s.ends_at)}
                        </Text>
                        <View style={styles.shiftMeta}>
                          <MapPin size={11} stroke={colors.textSecondary} />
                          <Text
                            style={styles.shiftMetaText}
                            numberOfLines={1}
                          >
                            {s.restaurant_name ?? "—"}
                          </Text>
                          {s.role && (
                            <Text style={styles.shiftRole}> · {s.role}</Text>
                          )}
                        </View>
                      </Pressable>
                    ))
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
  },
  todayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: 14,
  },
  todayBtnText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 13,
  },
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  navBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  weekLabelBox: {
    flex: 1,
    alignItems: "center",
  },
  weekLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  weekSubLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  center: {
    paddingVertical: 60,
    alignItems: "center",
  },
  dayRow: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  dayRowToday: {
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 6,
    marginVertical: 2,
    borderBottomColor: "transparent",
  },
  dayHeader: {
    width: 50,
    alignItems: "center",
    paddingTop: 4,
  },
  dayWeekday: {
    fontSize: 11,
    color: colors.textSecondary,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  dayNumber: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    marginTop: 2,
  },
  todayHighlight: {
    color: colors.primary,
  },
  dayShifts: {
    flex: 1,
    gap: 6,
    paddingLeft: 8,
  },
  dayOff: {
    backgroundColor: colors.divider,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dayOffText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  shiftBlock: {
    backgroundColor: colors.successLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  shiftTime: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  shiftMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  shiftMetaText: {
    fontSize: 12,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  shiftRole: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.6,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
});
