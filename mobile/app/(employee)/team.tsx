import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight, Users } from "lucide-react-native";
import { getRestaurantWeek } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { colors } from "@/lib/colors";
import {
  formatTimeRange,
  startOfWeek,
  weekDays,
  formatDayLabel,
  formatDayNumber,
  isSameDay,
} from "@/lib/format";

// ── Local type: one shift row with employee info flattened in ─────────────────

type TeamEntry = {
  id: string;
  employee_id: string;
  employee_name: string;
  role: string | null;
  starts_at: string;
  ends_at: string;
};

// ── Person row ────────────────────────────────────────────────────────────────

function PersonRow({ shift, isMe }: { shift: TeamEntry; isMe: boolean }) {
  const initials = shift.employee_name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <View style={row.wrap}>
      <View style={[row.avatar, isMe && row.avatarMe]}>
        <Text style={[row.initials, isMe && row.initialsMe]}>{initials}</Text>
      </View>
      <View style={row.info}>
        <View style={row.nameRow}>
          <Text style={row.name} numberOfLines={1}>
            {shift.employee_name}
          </Text>
          {isMe && (
            <View style={row.badge}>
              <Text style={row.badgeText}>Tú</Text>
            </View>
          )}
        </View>
        <Text style={row.time}>
          {formatTimeRange(shift.starts_at, shift.ends_at)}
        </Text>
        {shift.role ? <Text style={row.role}>{shift.role}</Text> : null}
      </View>
    </View>
  );
}

const row = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarMe: { backgroundColor: colors.primary, borderColor: colors.primary },
  initials: { fontSize: 15, fontWeight: "700", color: colors.primary },
  initialsMe: { color: "#fff" },
  info: { flex: 1, gap: 2 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 15, fontWeight: "600", color: colors.text, flexShrink: 1 },
  badge: {
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 11, fontWeight: "700", color: colors.primary },
  time: { fontSize: 13, color: colors.textSecondary },
  role: { fontSize: 12, color: colors.textTertiary, fontStyle: "italic" },
});

// ── Day selector tab ──────────────────────────────────────────────────────────

function DayTab({
  date,
  isSelected,
  onPress,
}: {
  date: Date;
  isSelected: boolean;
  onPress: () => void;
}) {
  const today = new Date();
  const isToday = isSameDay(date, today);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        dayTab.wrap,
        isSelected && dayTab.wrapSelected,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text
        style={[
          dayTab.label,
          isSelected && dayTab.labelSelected,
          isToday && !isSelected && dayTab.labelToday,
        ]}
      >
        {formatDayLabel(date)}
      </Text>
      <Text
        style={[
          dayTab.num,
          isSelected && dayTab.numSelected,
          isToday && !isSelected && dayTab.numToday,
        ]}
      >
        {formatDayNumber(date)}
      </Text>
    </Pressable>
  );
}

const dayTab = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 10,
  },
  wrapSelected: { backgroundColor: colors.primary },
  label: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.6)" },
  labelSelected: { color: "#fff" },
  labelToday: { color: colors.primaryLight },
  num: { fontSize: 18, fontWeight: "700", color: "rgba(255,255,255,0.8)", marginTop: 2 },
  numSelected: { color: "#fff" },
  numToday: { color: colors.primaryLight },
});

// ── Team screen ───────────────────────────────────────────────────────────────

export default function TeamScreen() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const today = useMemo(() => new Date(), []);

  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(today));
  const [selectedDay, setSelectedDay] = useState<Date>(today);

  const [allEntries, setAllEntries] = useState<TeamEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(() => weekDays(weekStart), [weekStart]);

  const restaurantId = user?.primary_restaurant_id ?? null;
  const restaurantName = user?.restaurant_name ?? null;

  const fetchWeek = useCallback(async () => {
    if (!token || !restaurantId) return;
    setLoading(true);
    setError(null);
    try {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const data = await getRestaurantWeek(token, restaurantId, weekStart, weekEnd);

      // Flatten RestaurantWeek.rows (grouped by employee) → flat TeamEntry[]
      const entries: TeamEntry[] = [];
      for (const employeeRow of data.rows) {
        for (const shift of employeeRow.shifts) {
          entries.push({
            id: shift.id,
            employee_id: employeeRow.user_id,
            employee_name: employeeRow.full_name,
            role: shift.role,
            starts_at: shift.starts_at,
            ends_at: shift.ends_at,
          });
        }
      }
      setAllEntries(entries);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar el equipo.");
    } finally {
      setLoading(false);
    }
  }, [token, restaurantId, weekStart]);

  useEffect(() => {
    void fetchWeek();
  }, [fetchWeek]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchWeek();
    setRefreshing(false);
  }, [fetchWeek]);

  function prevWeek() {
    setWeekStart((ws) => {
      const d = new Date(ws);
      d.setDate(d.getDate() - 7);
      return d;
    });
    setSelectedDay((sd) => {
      const d = new Date(sd);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }

  function nextWeek() {
    setWeekStart((ws) => {
      const d = new Date(ws);
      d.setDate(d.getDate() + 7);
      return d;
    });
    setSelectedDay((sd) => {
      const d = new Date(sd);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }

  const dayEntries = useMemo(() => {
    return allEntries
      .filter((e) => isSameDay(new Date(e.starts_at), selectedDay))
      .sort(
        (a, b) =>
          new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
      );
  }, [allEntries, selectedDay]);

  const weekLabel = useMemo(() => {
    const MONTHS = [
      "ene", "feb", "mar", "abr", "may", "jun",
      "jul", "ago", "sep", "oct", "nov", "dic",
    ];
    const ws = weekStart;
    const we = days[days.length - 1];
    if (ws.getMonth() === we.getMonth()) {
      return `${ws.getDate()}–${we.getDate()} ${MONTHS[ws.getMonth()]}`;
    }
    return `${ws.getDate()} ${MONTHS[ws.getMonth()]} – ${we.getDate()} ${MONTHS[we.getMonth()]}`;
  }, [weekStart, days]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Navy header ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Equipo</Text>
          {restaurantName ? (
            <Text style={styles.restaurantName} numberOfLines={1}>
              {restaurantName}
            </Text>
          ) : null}
        </View>

        {/* Week navigation */}
        <View style={styles.weekNav}>
          <Pressable
            onPress={prevWeek}
            hitSlop={10}
            style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.6 }]}
          >
            <ChevronLeft size={18} stroke="#fff" />
          </Pressable>
          <Text style={styles.weekLabel}>{weekLabel}</Text>
          <Pressable
            onPress={nextWeek}
            hitSlop={10}
            style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.6 }]}
          >
            <ChevronRight size={18} stroke="#fff" />
          </Pressable>
        </View>

        {/* Day tabs */}
        <View style={styles.dayTabs}>
          {days.map((d) => (
            <DayTab
              key={d.toISOString()}
              date={d}
              isSelected={isSameDay(d, selectedDay)}
              onPress={() => setSelectedDay(d)}
            />
          ))}
        </View>
      </View>

      {/* ── Body ── */}
      <View style={styles.body}>
        {!restaurantId ? (
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>Sin sucursal asignada</Text>
            <Text style={styles.emptyText}>
              Habla con tu manager para que te asigne a un restaurante.
            </Text>
          </View>
        ) : loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => void fetchWeek()} style={styles.retryBtn}>
              <Text style={styles.retryText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={dayEntries}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <PersonRow
                shift={item}
                isMe={item.employee_id === user?.id}
              />
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
            ListHeaderComponent={
              dayEntries.length > 0 ? (
                <View style={styles.listHeader}>
                  <Text style={styles.listHeaderText}>
                    {dayEntries.length} turno{dayEntries.length !== 1 ? "s" : ""}
                  </Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Users size={40} stroke={colors.textTertiary} strokeWidth={1.5} />
                <Text style={styles.emptyTitle}>Sin turnos este día</Text>
                <Text style={styles.emptyText}>
                  No hay nadie programado para trabajar.
                </Text>
              </View>
            }
            contentContainerStyle={dayEntries.length === 0 ? styles.emptyContainer : undefined}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  header: {
    backgroundColor: colors.navy,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: "700", color: "#fff" },
  restaurantName: {
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    fontWeight: "500",
    maxWidth: 160,
  },
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  weekLabel: { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.85)" },
  dayTabs: { flexDirection: "row", gap: 4 },
  body: { flex: 1, backgroundColor: colors.background },
  listHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  listHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 8,
  },
  emptyContainer: { flex: 1 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: "center",
    lineHeight: 20,
  },
  errorText: { fontSize: 14, color: colors.error, textAlign: "center" },
  retryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 8,
  },
  retryText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});
