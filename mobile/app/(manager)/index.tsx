/**
 * Manager · En vivo
 * Muestra quién está fichado ahora mismo y el resumen del día.
 * Endpoint: GET /manager/clock/live
 */
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { AlertCircle, Clock, UserCheck, UserX } from "lucide-react-native";
import { useAuthStore } from "@/store/authStore";
import { getManagerLive, type LiveEmployee, type LiveClockResponse } from "@/lib/api";
import { colors } from "@/lib/colors";

function formatElapsed(minutes: number | null): string {
  if (minutes === null) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  return `${h}h ${m.toString().padStart(2, "0")}min`;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function EmployeeRow({ item }: { item: LiveEmployee }) {
  const isIn = item.status === "CLOCKED_IN";
  const hasFlaggedReasons = item.flagged_reasons && item.flagged_reasons.length > 0;

  return (
    <View style={[styles.row, hasFlaggedReasons && styles.rowFlagged]}>
      <View style={styles.rowLeft}>
        <View style={[styles.statusDot, isIn ? styles.dotIn : styles.dotOut]} />
        <View>
          <Text style={styles.rowName}>{item.full_name}</Text>
          {isIn && item.clock_in_at ? (
            <Text style={styles.rowSub}>
              Entrada {formatTime(item.clock_in_at)} · {formatElapsed(item.elapsed_minutes)}
            </Text>
          ) : (
            <Text style={[styles.rowSub, styles.rowSubOff]}>Fuera</Text>
          )}
        </View>
      </View>
      <View style={styles.rowRight}>
        {isIn ? (
          <UserCheck size={18} stroke={colors.success} strokeWidth={2} />
        ) : (
          <UserX size={18} stroke={colors.textTertiary} strokeWidth={2} />
        )}
        {hasFlaggedReasons && (
          <AlertCircle size={16} stroke={colors.warning} strokeWidth={2} style={styles.flagIcon} />
        )}
      </View>
    </View>
  );
}

export default function ManagerDashboard() {
  const { token, user } = useAuthStore();
  const [data, setData] = useState<LiveClockResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!token) return;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const result = await getManagerLive(token);
        setData(result);
      } catch {
        setError("No se pudo cargar el estado en vivo.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    void load(true);
  };

  const today = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.restaurantName}>
          {user?.restaurant_name ?? "Mi restaurante"}
        </Text>
        <Text style={styles.dateText}>{today}</Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => void load()}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {data && (
        <>
          {/* Summary cards */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, styles.summaryCardIn]}>
              <Clock size={22} stroke={colors.success} strokeWidth={2} />
              <Text style={styles.summaryNumber}>{data.summary.clocked_in}</Text>
              <Text style={styles.summaryLabel}>Trabajando</Text>
            </View>
            <View style={[styles.summaryCard, styles.summaryCardOut]}>
              <UserX size={22} stroke={colors.textSecondary} strokeWidth={2} />
              <Text style={styles.summaryNumber}>{data.summary.off_duty}</Text>
              <Text style={styles.summaryLabel}>Fuera</Text>
            </View>
          </View>

          {/* Employee list */}
          <Text style={styles.sectionTitle}>Estado del equipo</Text>

          {data.employees.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No hay empleados registrados.</Text>
            </View>
          ) : (
            <View style={styles.listCard}>
              {data.employees.map((emp, i) => (
                <React.Fragment key={emp.employee_id}>
                  {i > 0 && <View style={styles.divider} />}
                  <EmployeeRow item={emp} />
                </React.Fragment>
              ))}
            </View>
          )}

          {/* Flagged notice */}
          {data.employees.some((e) => e.flagged_reasons?.length) && (
            <View style={styles.flagNotice}>
              <AlertCircle size={16} stroke={colors.warning} strokeWidth={2} />
              <Text style={styles.flagNoticeText}>
                Hay fichajes con incidencias. Revísalos en la pestaña Fichajes.
              </Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: { marginBottom: 20 },
  restaurantName: { fontSize: 22, fontWeight: "700", color: colors.text },
  dateText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
    textTransform: "capitalize",
  },

  summaryRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  summaryCard: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    gap: 4,
  },
  summaryCardIn: { backgroundColor: colors.successLight },
  summaryCardOut: { backgroundColor: colors.divider },
  summaryNumber: { fontSize: 28, fontWeight: "700", color: colors.text },
  summaryLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: "500" },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 10,
  },

  listCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowFlagged: { backgroundColor: colors.warningLight },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  dotIn: { backgroundColor: colors.success },
  dotOut: { backgroundColor: colors.textTertiary },
  rowName: { fontSize: 15, fontWeight: "600", color: colors.text },
  rowSub: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  rowSubOff: { color: colors.textTertiary },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  flagIcon: { marginLeft: 2 },
  divider: { height: 1, backgroundColor: colors.border },

  flagNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.warningLight,
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  flagNoticeText: { fontSize: 13, color: colors.warning, flex: 1 },

  errorBox: {
    backgroundColor: colors.errorLight,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  errorText: { color: colors.error, fontSize: 14 },
  retryText: { color: colors.primary, fontSize: 14, marginTop: 6, fontWeight: "600" },

  emptyBox: { padding: 20, alignItems: "center" },
  emptyText: { color: colors.textSecondary, fontSize: 14 },
});
