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
import { ChevronRight, Calendar } from "lucide-react-native";

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
import { StatusCard } from "@/components/StatusCard";
import { ClockButton } from "@/components/ClockButton";
import { ErrorBanner } from "@/components/ErrorBanner";
import { UpcomingShiftCard } from "@/components/UpcomingShiftCard";
import { colors } from "@/lib/colors";
import { greeting } from "@/lib/format";

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
      const shifts = await getMyUpcomingShifts(token, 3);
      setUpcoming(shifts);
    } catch (e) {
      // No bloqueamos la home si falla; el fichaje sigue funcionando
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
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Cabecera */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{greeting()},</Text>
          <Text style={styles.name} numberOfLines={1}>
            {user?.full_name ?? "—"}
          </Text>
        </View>

        {/* Error */}
        <ErrorBanner message={error} onDismiss={clearError} />

        {/* Estado actual */}
        {isLoadingStatus && !status ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : status ? (
          <StatusCard status={status} />
        ) : null}

        {/* Botón fichar */}
        {canClock && (
          <ClockButton
            action={isClockedIn ? "out" : "in"}
            onPress={handleClock}
            loading={isClocking}
          />
        )}

        {/* Estado no gestionable */}
        {status &&
          status.status !== "OFF_DUTY" &&
          status.status !== "CLOCKED_IN" && (
            <View style={styles.reviewBanner}>
              <Text style={styles.reviewText}>
                Tu turno tiene una incidencia pendiente de revisión por el
                manager. Puedes reportarlo desde Perfil → Reportar incidencia.
              </Text>
            </View>
          )}

        {/* Próximos turnos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Próximos turnos</Text>
            <Pressable
              onPress={() => router.push("/(employee)/schedule")}
              hitSlop={8}
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <View style={styles.viewAllRow}>
                <Text style={styles.viewAllText}>Ver todos</Text>
                <ChevronRight size={16} stroke={colors.primary} />
              </View>
            </Pressable>
          </View>

          {loadingUpcoming && upcoming.length === 0 ? (
            <View style={styles.upcomingPlaceholder}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : upcoming.length === 0 ? (
            <View style={styles.emptyState}>
              <Calendar size={24} stroke={colors.textTertiary} />
              <Text style={styles.emptyText}>
                No tienes turnos planificados todavía.
              </Text>
              <Text style={styles.emptySubText}>
                Tu manager los publicará desde el panel de horario.
              </Text>
            </View>
          ) : (
            upcoming.map((shift) => (
              <UpcomingShiftCard
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: 20,
    paddingTop: 28,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  name: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    marginTop: 2,
  },
  center: {
    paddingVertical: 40,
    alignItems: "center",
  },
  reviewBanner: {
    backgroundColor: colors.warningLight,
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginTop: 16,
  },
  reviewText: {
    fontSize: 14,
    color: "#92400E",
    lineHeight: 20,
  },
  section: {
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  viewAllRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  viewAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "500",
  },
  pressed: {
    opacity: 0.6,
  },
  upcomingPlaceholder: {
    paddingVertical: 30,
    alignItems: "center",
  },
  emptyState: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: "500",
    textAlign: "center",
  },
  emptySubText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
