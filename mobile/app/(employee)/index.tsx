import React, { useCallback, useEffect, useState } from "react";
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
import {
  Bell,
  Calendar,
  ChevronRight,
  AlertCircle,
  Clock,
  LogIn,
  LogOut,
  Store,
} from "lucide-react-native";

import {
  clockIn,
  clockOut,
  generateIdempotencyKey,
  getClockStatus,
  getMyUpcomingShifts,
  type Shift,
} from "@/lib/api";
import { requestAndGetLocation } from "@/lib/location";
import { useAuthStore } from "@/store/authStore";
import { useClockStore } from "@/store/clockStore";
import { ErrorBanner } from "@/components/ErrorBanner";
import { colors } from "@/lib/colors";
import {
  greeting,
  formatElapsed,
  formatTimeRange,
  formatMonthShort,
  formatWeekdayShort,
} from "@/lib/format";

// ── Horizontal shift card ─────────────────────────────────────────────────────

function ShiftCardH({
  shift,
  onPress,
}: {
  shift: Shift;
  onPress?: () => void;
}) {
  const start = new Date(shift.starts_at);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [cardH.card, pressed && { opacity: 0.7 }]}
    >
      <View style={cardH.dateBlock}>
        <Text style={cardH.weekday}>
          {formatWeekdayShort(start).toUpperCase()}
        </Text>
        <Text style={cardH.dayNum}>{start.getDate()}</Text>
        <Text style={cardH.month}>
          {formatMonthShort(start).toUpperCase()}
        </Text>
      </View>
      <View style={cardH.body}>
        <Text style={cardH.time}>
          {formatTimeRange(shift.starts_at, shift.ends_at)}
        </Text>
        <View style={cardH.restRow}>
          <Store size={12} stroke={colors.textTertiary} />
          <Text style={cardH.restName} numberOfLines={2}>
            {shift.restaurant_name ?? "—"}
          </Text>
        </View>
        {shift.role ? (
          <Text style={cardH.role} numberOfLines={1}>
            {shift.role}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const cardH = StyleSheet.create({
  card: {
    width: 168,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    overflow: "hidden",
    marginRight: 12,
  },
  dateBlock: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 5,
  },
  weekday: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: "700",
  },
  dayNum: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.primary,
    lineHeight: 26,
  },
  month: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: "700",
  },
  body: {
    padding: 12,
    gap: 5,
  },
  time: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  restRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  restName: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  role: {
    fontSize: 11,
    color: colors.textTertiary,
    fontStyle: "italic",
  },
});

// ── Quick action card ─────────────────────────────────────────────────────────

function ActionCard({
  icon,
  label,
  subtitle,
  iconBg,
  onPress,
  fullWidth = false,
}: {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  iconBg: string;
  onPress?: () => void;
  fullWidth?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        actionCard.card,
        fullWidth && actionCard.fullWidth,
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={[actionCard.iconWrap, { backgroundColor: iconBg }]}>
        {icon}
      </View>
      <View style={actionCard.textWrap}>
        <Text style={actionCard.label}>{label}</Text>
        {subtitle ? (
          <Text style={actionCard.subtitle}>{subtitle}</Text>
        ) : null}
      </View>
      {fullWidth && (
        <ChevronRight size={18} stroke={colors.textTertiary} />
      )}
    </Pressable>
  );
}

const actionCard = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    alignItems: "flex-start",
    gap: 10,
  },
  fullWidth: {
    flex: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

// ── Clock button ──────────────────────────────────────────────────────────────

function ClockCard({
  isClockedIn,
  canClock,
  isClocking,
  elapsedMinutes,
  clockInAt,
  onPress,
}: {
  isClockedIn: boolean;
  canClock: boolean;
  isClocking: boolean;
  elapsedMinutes?: number;
  clockInAt?: string;
  onPress: () => void;
}) {
  return (
    <View style={clockCard.wrap}>
      <View style={clockCard.info}>
        <View
          style={[
            clockCard.statusDot,
            { backgroundColor: isClockedIn ? colors.success : colors.border },
          ]}
        />
        <View>
          <Text style={clockCard.statusLabel}>
            {isClockedIn ? "Turno activo" : "Sin fichar"}
          </Text>
          {isClockedIn && elapsedMinutes !== undefined ? (
            <Text style={clockCard.elapsed}>
              {formatElapsed(elapsedMinutes)} trabajados
            </Text>
          ) : null}
        </View>
      </View>
      <Pressable
        onPress={onPress}
        disabled={!canClock || isClocking}
        style={({ pressed }) => [
          clockCard.btn,
          isClockedIn ? clockCard.btnOut : clockCard.btnIn,
          (!canClock || isClocking) && clockCard.btnDisabled,
          pressed && { opacity: 0.8 },
        ]}
      >
        {isClocking ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : isClockedIn ? (
          <>
            <LogOut size={18} stroke="#fff" />
            <Text style={clockCard.btnText}>Fichar salida</Text>
          </>
        ) : (
          <>
            <LogIn size={18} stroke="#fff" />
            <Text style={clockCard.btnText}>Fichar entrada</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const clockCard = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: -20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  info: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  elapsed: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  btnIn: { backgroundColor: colors.success },
  btnOut: { backgroundColor: colors.error },
  btnDisabled: { opacity: 0.5 },
  btnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});

// ── Home screen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const { status, isLoadingStatus, isClocking, error } = useClockStore();
  const { setStatus, setLoadingStatus, setClocking, setError, clearError } =
    useClockStore();

  const [refreshing, setRefreshing] = useState(false);
  const [upcoming, setUpcoming] = useState<Shift[]>([]);
  const [loadingUpcoming, setLoadingUpcoming] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!token) return;
    setLoadingStatus(true);
    try {
      const s = await getClockStatus(token);
      setStatus(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar estado.");
    } finally {
      setLoadingStatus(false);
    }
  }, [token]);

  const fetchUpcoming = useCallback(async () => {
    if (!token) return;
    setLoadingUpcoming(true);
    try {
      const shifts = await getMyUpcomingShifts(token, 6);
      setUpcoming(shifts);
    } catch (e) {
      console.warn("upcoming shifts failed", e);
    } finally {
      setLoadingUpcoming(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchStatus();
    void fetchUpcoming();
  }, [fetchStatus, fetchUpcoming]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchStatus(), fetchUpcoming()]);
    setRefreshing(false);
  }, [fetchStatus, fetchUpcoming]);

  async function handleClock() {
    if (!token || !user) return;
    clearError();
    if (!user.primary_restaurant_id) {
      setError("Tu cuenta no tiene una sucursal asignada. Avísale a tu manager.");
      return;
    }
    setClocking(true);
    try {
      const loc = await requestAndGetLocation();
      const payload = {
        restaurant_id: user.primary_restaurant_id,
        verification_method: "GPS" as const,
        idempotency_key: generateIdempotencyKey(),
        ...(loc ?? {}),
      };
      if (status?.status === "CLOCKED_IN") {
        await clockOut(token, payload);
      } else {
        await clockIn(token, payload);
      }
      await fetchStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al fichar.");
    } finally {
      setClocking(false);
    }
  }

  const isClockedIn = status?.status === "CLOCKED_IN";
  const canClock =
    status?.status === "OFF_DUTY" || status?.status === "CLOCKED_IN";

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Navy header ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.greetingText}>{greeting()}</Text>
          <View style={styles.bellWrap}>
            <Bell size={22} stroke="rgba(255,255,255,0.7)" />
          </View>
        </View>
        <Text style={styles.userName}>
          {user?.full_name?.split(" ")[0] ?? "—"}
        </Text>
        <Text style={styles.headerSub}>
          {isClockedIn
            ? (status?.elapsed_minutes ?? 0) < 2
              ? "Dentro · Turno activo"
              : `Dentro · ${formatElapsed(status?.elapsed_minutes ?? 0)} trabajados`
            : upcoming.length > 0
            ? `${upcoming.length} turno${upcoming.length > 1 ? "s" : ""} próximo${upcoming.length > 1 ? "s" : ""}`
            : "Sin turno programado hoy"}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* ── Clock card (overlaps header) ── */}
        {isLoadingStatus ? (
          <View style={[clockCard.wrap, { justifyContent: "center" }]}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <ClockCard
            isClockedIn={isClockedIn}
            canClock={canClock}
            isClocking={isClocking}
            elapsedMinutes={status?.elapsed_minutes ?? undefined}
            clockInAt={status?.clock_in_at ?? undefined}
            onPress={handleClock}
          />
        )}

        {/* ── Error banner ── */}
        {error ? (
          <View style={styles.errorWrap}>
            <ErrorBanner message={error} onDismiss={clearError} />
          </View>
        ) : null}

        {/* ── Upcoming shifts ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Próximos turnos</Text>
            <Pressable
              onPress={() => router.push("/(employee)/schedule")}
              hitSlop={8}
              style={({ pressed }) => [
                styles.seeAllBtn,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.seeAll}>Ver calendario</Text>
            </Pressable>
          </View>

          {loadingUpcoming ? (
            <ActivityIndicator
              color={colors.primary}
              style={{ marginTop: 8 }}
            />
          ) : upcoming.length === 0 ? (
            <View style={styles.emptyShifts}>
              <Calendar size={32} stroke={colors.textTertiary} strokeWidth={1.5} />
              <Text style={styles.emptyText}>Sin turnos asignados</Text>
              <Text style={styles.emptySubText}>
                Tu manager publicará el horario aquí cuando esté listo.
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.shiftsRow}
            >
              {upcoming.map((s) => (
                <ShiftCardH
                  key={s.id}
                  shift={s}
                  onPress={() =>
                    router.push({
                      pathname: "/(employee)/shift/[id]",
                      params: { id: s.id },
                    })
                  }
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── Quick actions ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acciones rápidas</Text>
          <View style={styles.actionGrid}>
            <ActionCard
              icon={<Clock size={22} stroke={colors.primary} />}
              label="Mis registros"
              subtitle="Historial de fichajes"
              iconBg={colors.primaryLight}
              onPress={() => router.push("/(employee)/history")}
            />
            <ActionCard
              icon={<AlertCircle size={22} stroke={colors.warning} />}
              label="Incidencia"
              subtitle="Reportar un problema"
              iconBg={colors.warningLight}
              onPress={() => router.push("/(employee)/incidents")}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.navy,
  },
  header: {
    backgroundColor: colors.navy,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 36,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  greetingText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "500",
  },
  bellWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  userName: {
    fontSize: 26,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  errorWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  seeAllBtn: { paddingBottom: 12 },
  seeAll: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: "600",
  },
  emptyShifts: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 6,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: 4,
  },
  emptySubText: {
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: "center",
    lineHeight: 19,
    maxWidth: 260,
  },
  shiftsRow: {
    paddingBottom: 4,
  },
  actionGrid: {
    flexDirection: "row",
    gap: 12,
  },
});
