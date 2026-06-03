/**
 * Manager · En vivo
 * Vista en tiempo real del equipo + acciones rápidas por empleado.
 * Tap en un empleado → bottom sheet con detalle y acciones.
 */
import React, { useCallback, useState } from "react";
import {
  View, Text, ScrollView, RefreshControl, StyleSheet,
  TouchableOpacity, ActivityIndicator, Modal, Pressable, Alert,
} from "react-native";
import { useFocusEffect } from "expo-router";
import {
  AlertCircle, Clock, UserCheck, UserX, ChevronRight,
  LogOut, X, Timer,
} from "lucide-react-native";
import { useAuthStore } from "@/store/authStore";
import {
  getManagerLive, closeSessionManually,
  type LiveEmployee, type LiveClockResponse,
} from "@/lib/api";
import { colors } from "@/lib/colors";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatElapsed(minutes: number | null): string {
  if (minutes === null || minutes < 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  return `${h}h ${m.toString().padStart(2, "0")}min`;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

// ── Employee row ──────────────────────────────────────────────────────────────

function EmployeeRow({
  item,
  onPress,
}: {
  item: LiveEmployee;
  onPress: () => void;
}) {
  const isIn = item.status === "CLOCKED_IN";
  const hasFlagged = (item.flagged_reasons?.length ?? 0) > 0;

  return (
    <TouchableOpacity
      style={[styles.row, hasFlagged && styles.rowFlagged]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={[styles.avatar, isIn ? styles.avatarIn : styles.avatarOut]}>
        <Text style={[styles.avatarText, isIn ? styles.avatarTextIn : styles.avatarTextOut]}>
          {initials(item.full_name)}
        </Text>
      </View>

      {/* Info */}
      <View style={styles.rowBody}>
        <View style={styles.rowNameRow}>
          <Text style={styles.rowName}>{item.full_name}</Text>
          {hasFlagged && (
            <AlertCircle size={14} stroke={colors.warning} strokeWidth={2} />
          )}
        </View>
        {isIn && item.clock_in_at ? (
          <Text style={styles.rowSub}>
            Entró a las {formatTime(item.clock_in_at)}
            {item.elapsed_minutes ? ` · ${formatElapsed(item.elapsed_minutes)}` : ""}
          </Text>
        ) : (
          <Text style={[styles.rowSub, { color: colors.textTertiary }]}>Fuera del turno</Text>
        )}
        {hasFlagged && item.flagged_reasons && (
          <Text style={styles.rowFlag} numberOfLines={1}>
            ⚠ {item.flagged_reasons.join(", ")}
          </Text>
        )}
      </View>

      {/* Status + chevron */}
      <View style={styles.rowRight}>
        <View style={[styles.statusPill, isIn ? styles.pillIn : styles.pillOut]}>
          <Text style={[styles.pillText, isIn ? styles.pillTextIn : styles.pillTextOut]}>
            {isIn ? "Dentro" : "Fuera"}
          </Text>
        </View>
        <ChevronRight size={16} stroke={colors.textTertiary} strokeWidth={2} />
      </View>
    </TouchableOpacity>
  );
}

// ── Employee action modal ─────────────────────────────────────────────────────

function EmployeeModal({
  employee,
  token,
  onClose,
  onActionDone,
}: {
  employee: LiveEmployee | null;
  token: string | null;
  onClose: () => void;
  onActionDone: () => void;
}) {
  const [closing, setClosing] = useState(false);

  if (!employee) return null;

  const isIn = employee.status === "CLOCKED_IN";

  function confirmClose() {
    Alert.alert(
      "Cerrar turno manualmente",
      `¿Seguro que quieres cerrar el turno de ${employee!.full_name}? Se registrará la hora actual como salida.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar turno",
          style: "destructive",
          onPress: async () => {
            if (!token || !employee!.work_session_id) return;
            setClosing(true);
            try {
              await closeSessionManually(
                token,
                employee!.work_session_id,
                "Cierre manual por manager desde app"
              );
              onActionDone();
              onClose();
            } catch (e) {
              Alert.alert(
                "Error",
                e instanceof Error ? e.message : "No se pudo cerrar el turno."
              );
            } finally {
              setClosing(false);
            }
          },
        },
      ]
    );
  }

  return (
    <Modal
      visible={!!employee}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.sheet}>
        {/* Header */}
        <View style={styles.sheetHeader}>
          <View style={[styles.sheetAvatar, isIn ? styles.avatarIn : styles.avatarOut]}>
            <Text style={[styles.sheetAvatarText, isIn ? styles.avatarTextIn : styles.avatarTextOut]}>
              {initials(employee.full_name)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sheetName}>{employee.full_name}</Text>
            <Text style={styles.sheetStatus}>
              {isIn ? "Trabajando ahora" : "Fuera del turno"}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <X size={22} stroke={colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Details */}
        {isIn && (
          <View style={styles.sheetDetails}>
            <View style={styles.detailRow}>
              <Clock size={16} stroke={colors.textSecondary} strokeWidth={2} />
              <Text style={styles.detailLabel}>Entrada</Text>
              <Text style={styles.detailValue}>{formatTime(employee.clock_in_at)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Timer size={16} stroke={colors.textSecondary} strokeWidth={2} />
              <Text style={styles.detailLabel}>Tiempo trabajado</Text>
              <Text style={styles.detailValue}>{formatElapsed(employee.elapsed_minutes)}</Text>
            </View>
            {(employee.flagged_reasons?.length ?? 0) > 0 && (
              <View style={[styles.detailRow, styles.detailFlagged]}>
                <AlertCircle size={16} stroke={colors.warning} strokeWidth={2} />
                <Text style={[styles.detailLabel, { color: colors.warning, flex: 1 }]}>
                  {employee.flagged_reasons!.join(", ")}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.sheetActions}>
          {isIn && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnDestructive]}
              onPress={confirmClose}
              disabled={closing}
              activeOpacity={0.8}
            >
              {closing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <LogOut size={18} stroke="#fff" strokeWidth={2} />
                  <Text style={styles.actionBtnText}>Cerrar turno manualmente</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionBtnSecondary} onPress={onClose}>
            <Text style={styles.actionBtnSecondaryText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ManagerDashboard() {
  const { token, user } = useAuthStore();
  const [data, setData] = useState<LiveClockResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<LiveEmployee | null>(null);

  const load = useCallback(async (silent = false) => {
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
  }, [token]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); void load(true); };

  const today = new Date().toLocaleDateString("es-ES", {
    weekday: "long", day: "numeric", month: "long",
  });

  const pendingFlags = data?.employees.filter(
    (e) => (e.flagged_reasons?.length ?? 0) > 0
  ).length ?? 0;

  const clockedIn = data?.summary.clocked_in ?? 0;
  const offDuty = data?.summary.off_duty ?? 0;

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.restaurantName}>
              {user?.restaurant_name ?? "Mi restaurante"}
            </Text>
            <Text style={styles.dateText}>{today}</Text>
          </View>
          {pendingFlags > 0 && (
            <View style={styles.alertPill}>
              <AlertCircle size={14} stroke={colors.warning} strokeWidth={2} />
              <Text style={styles.alertPillText}>
                {pendingFlags} alerta{pendingFlags > 1 ? "s" : ""}
              </Text>
            </View>
          )}
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.summaryCardIn]}>
            <UserCheck size={24} stroke={colors.success} strokeWidth={2} />
            <Text style={styles.summaryNumber}>{clockedIn}</Text>
            <Text style={styles.summaryLabel}>Trabajando</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryCardOut]}>
            <UserX size={24} stroke={colors.textSecondary} strokeWidth={2} />
            <Text style={styles.summaryNumber}>{offDuty}</Text>
            <Text style={styles.summaryLabel}>Fuera</Text>
          </View>
          {data && (
            <View style={[styles.summaryCard, styles.summaryCardTime]}>
              <Clock size={24} stroke={colors.primary} strokeWidth={2} />
              <Text style={styles.summaryNumber}>
                {data.employees
                  .filter((e) => e.status === "CLOCKED_IN")
                  .reduce((acc, e) => acc + (e.elapsed_minutes ?? 0), 0) >= 60
                  ? `${Math.floor(data.employees
                      .filter((e) => e.status === "CLOCKED_IN")
                      .reduce((acc, e) => acc + (e.elapsed_minutes ?? 0), 0) / 60)}h`
                  : `${data.employees
                      .filter((e) => e.status === "CLOCKED_IN")
                      .reduce((acc, e) => acc + (e.elapsed_minutes ?? 0), 0)}m`}
              </Text>
              <Text style={styles.summaryLabel}>Horas hoy</Text>
            </View>
          )}
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => void load()}>
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Employee list */}
        {data && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Equipo ahora</Text>
              <Text style={styles.sectionHint}>Toca para ver opciones</Text>
            </View>

            {data.employees.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No hay empleados registrados aún.</Text>
              </View>
            ) : (
              <View style={styles.listCard}>
                {data.employees.map((emp, i) => (
                  <React.Fragment key={emp.employee_id}>
                    {i > 0 && <View style={styles.divider} />}
                    <EmployeeRow
                      item={emp}
                      onPress={() => setSelectedEmployee(emp)}
                    />
                  </React.Fragment>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Employee modal */}
      <EmployeeModal
        employee={selectedEmployee}
        token={token}
        onClose={() => setSelectedEmployee(null)}
        onActionDone={() => void load(true)}
      />
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 48 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  restaurantName: { fontSize: 22, fontWeight: "700", color: colors.text },
  dateText: {
    fontSize: 13, color: colors.textSecondary,
    marginTop: 2, textTransform: "capitalize",
  },
  alertPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: colors.warningLight,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  alertPillText: { fontSize: 12, color: colors.warning, fontWeight: "600" },

  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  summaryCard: {
    flex: 1, alignItems: "center", padding: 14,
    borderRadius: 14, gap: 4,
  },
  summaryCardIn: { backgroundColor: colors.successLight },
  summaryCardOut: { backgroundColor: colors.divider },
  summaryCardTime: { backgroundColor: colors.primaryLight },
  summaryNumber: { fontSize: 26, fontWeight: "700", color: colors.text },
  summaryLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: "500" },

  sectionHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  sectionHint: { fontSize: 12, color: colors.textTertiary },

  listCard: {
    backgroundColor: colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border, overflow: "hidden",
  },
  row: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 14, gap: 12,
  },
  rowFlagged: { backgroundColor: colors.warningLight },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
  },
  avatarIn: { backgroundColor: colors.successLight },
  avatarOut: { backgroundColor: colors.divider },
  avatarText: { fontSize: 16, fontWeight: "700" },
  avatarTextIn: { color: colors.success },
  avatarTextOut: { color: colors.textSecondary },
  rowBody: { flex: 1 },
  rowNameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  rowName: { fontSize: 15, fontWeight: "600", color: colors.text },
  rowSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  rowFlag: { fontSize: 11, color: colors.warning, marginTop: 3 },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusPill: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  pillIn: { backgroundColor: colors.successLight },
  pillOut: { backgroundColor: colors.divider },
  pillText: { fontSize: 11, fontWeight: "600" },
  pillTextIn: { color: colors.success },
  pillTextOut: { color: colors.textSecondary },
  divider: { height: 1, backgroundColor: colors.border },

  errorBox: {
    backgroundColor: colors.errorLight, borderRadius: 10,
    padding: 14, marginBottom: 16,
  },
  errorText: { color: colors.error, fontSize: 14 },
  retryText: { color: colors.primary, fontSize: 14, marginTop: 6, fontWeight: "600" },
  emptyBox: { padding: 20, alignItems: "center" },
  emptyText: { color: colors.textSecondary, fontSize: 14 },

  // Modal
  overlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 36,
  },
  sheetHeader: {
    flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20,
  },
  sheetAvatar: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: "center", justifyContent: "center",
  },
  sheetAvatarText: { fontSize: 20, fontWeight: "700" },
  sheetName: { fontSize: 18, fontWeight: "700", color: colors.text },
  sheetStatus: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  sheetDetails: {
    backgroundColor: colors.background, borderRadius: 12,
    padding: 14, gap: 10, marginBottom: 20,
  },
  detailRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  detailFlagged: {
    backgroundColor: colors.warningLight, borderRadius: 8, padding: 8,
  },
  detailLabel: { flex: 1, fontSize: 13, color: colors.textSecondary },
  detailValue: { fontSize: 14, fontWeight: "600", color: colors.text },
  sheetActions: { gap: 10 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 12, paddingVertical: 14,
  },
  actionBtnDestructive: { backgroundColor: colors.error },
  actionBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  actionBtnSecondary: {
    borderRadius: 12, paddingVertical: 14,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center",
  },
  actionBtnSecondaryText: { fontSize: 16, color: colors.textSecondary, fontWeight: "500" },
});
