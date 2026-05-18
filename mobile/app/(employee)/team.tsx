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
import { ChevronLeft, ChevronRight, Users } from "lucide-react-native";

import {
  getRestaurantWeek,
  type RestaurantWeek,
  type Shift,
} from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { colors } from "@/lib/colors";
import {
  formatTimeRange,
  formatWeekdayShort,
  formatDayNumber,
  isSameDay,
  startOfWeek,
  weekDays,
} from "@/lib/format";

export default function TeamScreen() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek());
  const [selectedDay, setSelectedDay] = useState<Date>(() => {
    const today = new Date();
    const ws = startOfWeek();
    return isSameDay(today, ws) || today >= ws ? today : ws;
  });
  const [data, setData] = useState<RestaurantWeek | null>(null);
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
    if (!token || !user?.primary_restaurant_id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getRestaurantWeek(
        token,
        user.primary_restaurant_id,
        weekStart,
        weekEnd
      );
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar el equipo.");
    } finally {
      setLoading(false);
    }
  }, [token, user, weekStart, weekEnd]);

  useEffect(() => {
    void fetchWeek();
  }, [fetchWeek]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchWeek();
    setRefreshing(false);
  }, [fetchWeek]);

  // Reparte los shifts por (user_id, day)
  const rowsForSelectedDay = useMemo(() => {
    if (!data) return [];
    return data.rows
      .map((row) => {
        const shiftsToday = row.shifts.filter((s) =>
          isSameDay(new Date(s.starts_at), selectedDay)
        );
        return { ...row, shifts: shiftsToday };
      })
      .filter((row) => row.shifts.length > 0);
  }, [data, selectedDay]);

  function shiftWeekBy(deltaDays: number) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + deltaDays);
    setWeekStart(d);
    // Mantener selected day dentro de la nueva semana
    const newSelected = new Date(d);
    newSelected.setDate(d.getDate() + selectedDay.getDay());
    setSelectedDay(newSelected);
  }

  const weekLabel = useMemo(() => {
    const start = weekStart.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });
    const end = new Date(weekEnd);
    end.setDate(end.getDate() - 1);
    return `${start} – ${end.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    })}`;
  }, [weekStart, weekEnd]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerBar}>
        <Text style={styles.title}>Equipo</Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {data?.restaurant_name ?? user?.restaurant_name ?? "—"}
        </Text>
      </View>

      <View style={styles.weekNav}>
        <Pressable
          onPress={() => shiftWeekBy(-7)}
          hitSlop={10}
          style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
        >
          <ChevronLeft size={22} stroke={colors.text} />
        </Pressable>
        <Text style={styles.weekLabel}>{weekLabel}</Text>
        <Pressable
          onPress={() => shiftWeekBy(7)}
          hitSlop={10}
          style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
        >
          <ChevronRight size={22} stroke={colors.text} />
        </Pressable>
      </View>

      {/* Selector horizontal de días */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.daysStrip}
      >
        {days.map((d) => {
          const selected = isSameDay(d, selectedDay);
          const isToday = isSameDay(d, new Date());
          return (
            <Pressable
              key={d.toISOString()}
              onPress={() => setSelectedDay(d)}
              style={({ pressed }) => [
                styles.dayChip,
                selected && styles.dayChipSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.dayChipWeekday,
                  selected && styles.dayChipSelectedText,
                  !selected && isToday && styles.todayText,
                ]}
              >
                {formatWeekdayShort(d)}
              </Text>
              <Text
                style={[
                  styles.dayChipNumber,
                  selected && styles.dayChipSelectedText,
                  !selected && isToday && styles.todayText,
                ]}
              >
                {formatDayNumber(d)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {loading && !data ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : rowsForSelectedDay.length === 0 ? (
          <View style={styles.empty}>
            <Users size={28} stroke={colors.textTertiary} />
            <Text style={styles.emptyTitle}>Sin turnos programados</Text>
            <Text style={styles.emptyText}>
              Nadie tiene turno este día en {data?.restaurant_name ?? "esta sucursal"}.
            </Text>
          </View>
        ) : (
          rowsForSelectedDay.map((row) => (
            <View key={row.user_id} style={styles.personRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(row.full_name)}</Text>
              </View>
              <View style={styles.personInfo}>
                <Text style={styles.personName}>
                  {row.full_name}
                  {user && row.user_id === user.id ? (
                    <Text style={styles.youTag}>  · Tú</Text>
                  ) : null}
                </Text>
                <View style={styles.shiftPills}>
                  {row.shifts.map((s: Shift) => (
                    <View key={s.id} style={styles.shiftPill}>
                      <Text style={styles.shiftPillText}>
                        {formatTimeRange(s.starts_at, s.ends_at)}
                      </Text>
                      {s.role && (
                        <Text style={styles.shiftPillRole}>{s.role}</Text>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  headerBar: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  navBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  weekLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
  },
  daysStrip: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 10,
    gap: 6,
  },
  dayChip: {
    width: 48,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  dayChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayChipSelectedText: {
    color: "#FFFFFF",
  },
  dayChipWeekday: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
    textTransform: "uppercase",
  },
  dayChipNumber: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginTop: 2,
  },
  todayText: {
    color: colors.primary,
  },
  list: {
    padding: 16,
    paddingBottom: 40,
    gap: 10,
  },
  center: {
    paddingVertical: 60,
    alignItems: "center",
  },
  empty: {
    paddingTop: 60,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  personInfo: {
    flex: 1,
    gap: 6,
  },
  personName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  youTag: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "600",
  },
  shiftPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  shiftPill: {
    backgroundColor: colors.successLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  shiftPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  shiftPillRole: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
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
