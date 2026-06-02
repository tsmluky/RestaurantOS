/**
 * Manager · Fichajes del día
 * Lista de sesiones de trabajo con filtro por fecha y opción de corrección.
 * Endpoint: GET /manager/work-sessions?date_from=X&date_to=X
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
import { ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, Clock } from "lucide-react-native";
import { useAuthStore } from "@/store/authStore";
import { getManagerSessions, type ManagerSession } from "@/lib/api";
import { colors } from "@/lib/colors";

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(minutes: number | null): string {
  if (minutes === null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, "0")}min`;
}

function statusColor(status: string): string {
  if (status === "OPEN") return colors.primary;
  if (status === "FLAGGED") return colors.warning;
  return colors.success;
}

function statusLabel(status: string): string {
  if (status === "OPEN") return "En curso";
  if (status === "FLAGGED") return "Revisión";
  return "Cerrado";
}

function SessionCard({ session }: { session: ManagerSession }) {
  const color = statusColor(session.status);
  const isFlagged = session.status === "FLAGGED" || (session.flagged_reasons?.length ?? 0) > 0;

  return (
    <View style={[styles.card, isFlagged && styles.cardFlagged]}>
      <View style={styles.cardHeader}>
        <Text style={styles.employeeName}>{session.full_name}</Text>
        <View style={[styles.badge, { backgroundColor: color + "20" }]}>
          <Text style={[styles.badgeText, { color }]}>{statusLabel(session.status)}</Text>
        </View>
      </View>

      <View style={styles.cardRow}>
        <View style={styles.cardCell}>
          <Text style={styles.cellLabel}>Entrada</Text>
          <Text style={styles.cellValue}>{formatTime(session.clock_in_at)}</Text>
        </View>
        <View style={styles.cardCell}>
          <Text style={styles.cellLabel}>Salida</Text>
          <Text style={styles.cellValue}>{formatTime(session.clock_out_at)}</Text>
        </View>
        <View style={styles.cardCell}>
          <Text style={styles.cellLabel}>Duración</Text>
          <Text style={styles.cellValue}>{formatDuration(session.duration_minutes)}</Text>
        </View>
      </View>

      {isFlagged && session.flagged_reasons && session.flagged_reasons.length > 0 && (
        <View style={styles.flagRow}>
          <AlertTriangle size={13} stroke={colors.warning} strokeWidth={2} />
          <Text style={styles.flagText}>{session.flagged_reasons.join(" · ")}</Text>
        </View>
      )}

      {session.was_corrected && (
        <View style={styles.correctedRow}>
          <CheckCircle size={13} stroke={colors.success} strokeWidth={2} />
          <Text style={styles.correctedText}>Corregido</Text>
        </View>
      )}
    </View>
  );
}

export default function ManagerFichajes() {
  const { token } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sessions, setSessions] = useState<ManagerSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (date: Date, silent = false) => {
      if (!token) return;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const dateStr = toDateStr(date);
        const result = await getManagerSessions(token, dateStr, dateStr);
        setSessions(result);
      } catch {
        setError("No se pudieron cargar los fichajes.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useFocusEffect(
    useCallback(() => {
      void load(selectedDate);
    }, [load, selectedDate])
  );

  const changeDate = (delta: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + delta);
    setSelectedDate(next);
    void load(next);
  };

  const onRefresh = () => {
    setRefreshing(true);
    void load(selectedDate, true);
  };

  const dateLabel = selectedDate.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const isToday = toDateStr(selectedDate) === toDateStr(new Date());

  const clocked = sessions.filter((s) => s.status !== "OPEN").length;
  const inProgress = sessions.filter((s) => s.status === "OPEN").length;
  const flagged = sessions.filter(
    (s) => s.status === "FLAGGED" || (s.flagged_reasons?.length ?? 0) > 0
  ).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Date navigation */}
      <View style={styles.dateNav}>
        <TouchableOpacity style={styles.dateBtn} onPress={() => changeDate(-1)}>
          <ChevronLeft size={20} stroke={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.dateLabelWrap}>
          <Text style={styles.dateLabel}>{dateLabel}</Text>
          {isToday && <Text style={styles.todayBadge}>Hoy</Text>}
        </View>
        <TouchableOpacity
          style={[styles.dateBtn, isToday && styles.dateBtnDisabled]}
          onPress={() => !isToday && changeDate(1)}
          disabled={isToday}
        >
          <ChevronRight size={20} stroke={isToday ? colors.textTertiary : colors.text} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Stats strip */}
      {!loading && sessions.length > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{sessions.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{inProgress}</Text>
            <Text style={styles.statLabel}>En curso</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.success }]}>{clocked}</Text>
            <Text style={styles.statLabel}>Cerrados</Text>
          </View>
          {flagged > 0 && (
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.warning }]}>{flagged}</Text>
              <Text style={styles.statLabel}>Alertas</Text>
            </View>
          )}
        </View>
      )}

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => void load(selectedDate)}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.emptyBox}>
          <Clock size={36} stroke={colors.textTertiary} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>Sin fichajes</Text>
          <Text style={styles.emptyText}>No hay registros para este día.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {sessions.map((s) => (
            <SessionCard key={s.id} session={s} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  centered: { paddingVertical: 60, alignItems: "center" },

  dateNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  dateBtn: { padding: 8 },
  dateBtnDisabled: { opacity: 0.3 },
  dateLabelWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  dateLabel: { fontSize: 16, fontWeight: "600", color: colors.text, textTransform: "capitalize" },
  todayBadge: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.primary,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },

  statsRow: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 16,
    justifyContent: "space-around",
  },
  statItem: { alignItems: "center" },
  statNumber: { fontSize: 20, fontWeight: "700", color: colors.text },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },

  list: { gap: 10 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  cardFlagged: { borderColor: colors.warning + "60", backgroundColor: colors.warningLight },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  employeeName: { fontSize: 15, fontWeight: "600", color: colors.text },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: { fontSize: 12, fontWeight: "600" },
  cardRow: { flexDirection: "row", justifyContent: "space-between" },
  cardCell: { flex: 1 },
  cellLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: 2 },
  cellValue: { fontSize: 14, fontWeight: "600", color: colors.text },
  flagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.warning + "40",
  },
  flagText: { fontSize: 12, color: colors.warning, flex: 1 },
  correctedRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  correctedText: { fontSize: 12, color: colors.success },

  errorBox: {
    backgroundColor: colors.errorLight,
    borderRadius: 10,
    padding: 14,
  },
  errorText: { color: colors.error, fontSize: 14 },
  retryText: { color: colors.primary, fontSize: 14, marginTop: 6, fontWeight: "600" },

  emptyBox: { paddingVertical: 60, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: colors.textSecondary },
  emptyText: { fontSize: 14, color: colors.textTertiary },
});
