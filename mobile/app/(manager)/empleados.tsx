/**
 * Manager · Equipo
 * Lista de empleados con su estado actual y tiempo acumulado hoy.
 * Reutiliza el endpoint GET /manager/clock/live con vista diferente.
 */
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Search, UserCheck, UserX, AlertCircle } from "lucide-react-native";
import { useAuthStore } from "@/store/authStore";
import { getManagerLive, type LiveEmployee, type LiveClockResponse } from "@/lib/api";
import { colors } from "@/lib/colors";

function formatElapsed(minutes: number | null): string {
  if (minutes === null) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return `${h}h ${m.toString().padStart(2, "0")}min`;
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function EmployeeCard({ item }: { item: LiveEmployee }) {
  const isIn = item.status === "CLOCKED_IN";
  const hasFlagged = item.flagged_reasons && item.flagged_reasons.length > 0;

  return (
    <View style={[styles.card, isIn && styles.cardIn]}>
      {/* Avatar */}
      <View style={[styles.avatar, isIn ? styles.avatarIn : styles.avatarOut]}>
        <Text style={[styles.avatarText, isIn ? styles.avatarTextIn : styles.avatarTextOut]}>
          {initials(item.full_name)}
        </Text>
      </View>

      {/* Info */}
      <View style={styles.cardBody}>
        <View style={styles.cardNameRow}>
          <Text style={styles.cardName}>{item.full_name}</Text>
          {hasFlagged && (
            <AlertCircle size={15} stroke={colors.warning} strokeWidth={2} />
          )}
        </View>

        {isIn && item.clock_in_at ? (
          <Text style={styles.cardSub}>
            Entrada a las {formatTime(item.clock_in_at)}
            {item.elapsed_minutes !== null ? ` · ${formatElapsed(item.elapsed_minutes)}` : ""}
          </Text>
        ) : (
          <Text style={[styles.cardSub, styles.cardSubOff]}>Sin fichar</Text>
        )}

        {hasFlagged && (
          <Text style={styles.flagText} numberOfLines={1}>
            ⚠ {item.flagged_reasons!.join(", ")}
          </Text>
        )}
      </View>

      {/* Status icon */}
      <View style={styles.cardStatus}>
        {isIn ? (
          <UserCheck size={20} stroke={colors.success} strokeWidth={2} />
        ) : (
          <UserX size={20} stroke={colors.textTertiary} strokeWidth={2} />
        )}
      </View>
    </View>
  );
}

type Filter = "todos" | "dentro" | "fuera";

export default function ManagerEmpleados() {
  const { token } = useAuthStore();
  const [data, setData] = useState<LiveClockResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");

  const load = useCallback(
    async (silent = false) => {
      if (!token) return;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const result = await getManagerLive(token);
        setData(result);
      } catch {
        setError("No se pudo cargar el equipo.");
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

  const employees = (data?.employees ?? [])
    .filter((e) => {
      if (filter === "dentro") return e.status === "CLOCKED_IN";
      if (filter === "fuera") return e.status === "OFF_DUTY";
      return true;
    })
    .filter((e) => e.full_name.toLowerCase().includes(search.toLowerCase()));

  const filterOptions: { key: Filter; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "dentro", label: "Dentro" },
    { key: "fuera", label: "Fuera" },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Search */}
      <View style={styles.searchBox}>
        <Search size={16} stroke={colors.textSecondary} strokeWidth={2} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar empleado..."
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {filterOptions.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.filterTab, filter === opt.key && styles.filterTabActive]}
            onPress={() => setFilter(opt.key)}
          >
            <Text style={[styles.filterTabText, filter === opt.key && styles.filterTabTextActive]}>
              {opt.label}
              {data && opt.key !== "todos" && (
                <Text>
                  {" "}
                  ({opt.key === "dentro" ? data.summary.clocked_in : data.summary.off_duty})
                </Text>
              )}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => void load()}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : employees.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            {search ? `Sin resultados para "${search}"` : "Sin empleados en este filtro."}
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {employees.map((e) => (
            <EmployeeCard key={e.employee_id} item={e} />
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

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text },

  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  filterTabActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  filterTabText: { fontSize: 13, fontWeight: "500", color: colors.textSecondary },
  filterTabTextActive: { color: colors.primary },

  list: { gap: 10 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12,
  },
  cardIn: { borderColor: colors.success + "40" },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarIn: { backgroundColor: colors.successLight },
  avatarOut: { backgroundColor: colors.divider },
  avatarText: { fontSize: 16, fontWeight: "700" },
  avatarTextIn: { color: colors.success },
  avatarTextOut: { color: colors.textSecondary },

  cardBody: { flex: 1 },
  cardNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardName: { fontSize: 15, fontWeight: "600", color: colors.text },
  cardSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  cardSubOff: { color: colors.textTertiary },
  flagText: { fontSize: 11, color: colors.warning, marginTop: 3 },

  cardStatus: {},

  errorBox: {
    backgroundColor: colors.errorLight,
    borderRadius: 10,
    padding: 14,
  },
  errorText: { color: colors.error, fontSize: 14 },
  retryText: { color: colors.primary, fontSize: 14, marginTop: 6, fontWeight: "600" },

  emptyBox: { paddingVertical: 40, alignItems: "center" },
  emptyText: { color: colors.textSecondary, fontSize: 14 },
});
