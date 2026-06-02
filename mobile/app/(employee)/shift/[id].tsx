import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Clock,
  MapPin,
  Users,
  Briefcase,
  FileText,
} from "lucide-react-native";

import { getShiftDetail, type ShiftWithTeammates } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { colors } from "@/lib/colors";
import {
  formatDateLong,
  formatTimeRange,
  formatElapsed,
} from "@/lib/format";

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={row.wrap}>
      <View style={row.iconWrap}>{icon}</View>
      <View style={row.text}>
        <Text style={row.label}>{label}</Text>
        <Text style={row.value}>{value}</Text>
      </View>
    </View>
  );
}

const row = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1 },
  label: { fontSize: 12, color: colors.textTertiary, marginBottom: 2 },
  value: { fontSize: 15, fontWeight: "500", color: colors.text },
});

export default function ShiftDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  const [shift, setShift] = useState<ShiftWithTeammates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchShift = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getShiftDetail(token, id);
      setShift(data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo cargar el turno."
      );
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    void fetchShift();
  }, [fetchShift]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.headerBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => [
            styles.backBtn,
            pressed && { opacity: 0.6 },
          ]}
        >
          <ArrowLeft size={22} stroke={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Detalle del turno</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.errorCenter}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            onPress={fetchShift}
            style={({ pressed }) => [
              styles.retryBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : shift ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero card */}
          <View style={styles.heroCard}>
            <View
              style={[
                styles.statusBadge,
                shift.status === "CANCELLED" && styles.statusBadgeCancelled,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  shift.status === "CANCELLED" &&
                    styles.statusBadgeTextCancelled,
                ]}
              >
                {shift.status === "CANCELLED" ? "Cancelado" : "Programado"}
              </Text>
            </View>

            <Text style={styles.heroDate}>
              {formatDateLong(shift.starts_at)}
            </Text>
            <Text style={styles.heroTime}>
              {formatTimeRange(shift.starts_at, shift.ends_at)}
            </Text>
            <Text style={styles.heroDuration}>
              {formatElapsed(shift.duration_minutes)} de turno
            </Text>
          </View>

          {/* Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información</Text>
            <View style={styles.card}>
              <InfoRow
                icon={<Clock size={18} stroke={colors.primary} />}
                label="Horario"
                value={formatTimeRange(shift.starts_at, shift.ends_at)}
              />
              {shift.restaurant_name ? (
                <InfoRow
                  icon={<MapPin size={18} stroke={colors.primary} />}
                  label="Sucursal"
                  value={shift.restaurant_name}
                />
              ) : null}
              {shift.role ? (
                <InfoRow
                  icon={<Briefcase size={18} stroke={colors.primary} />}
                  label="Puesto"
                  value={shift.role}
                />
              ) : null}
              {shift.notes ? (
                <View style={[row.wrap, { borderBottomWidth: 0 }]}>
                  <View style={row.iconWrap}>
                    <FileText size={18} stroke={colors.primary} />
                  </View>
                  <View style={row.text}>
                    <Text style={row.label}>Notas</Text>
                    <Text style={row.value}>{shift.notes}</Text>
                  </View>
                </View>
              ) : null}
            </View>
          </View>

          {/* Teammates */}
          {shift.teammates && shift.teammates.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Compañeros en este turno
              </Text>
              <View style={styles.card}>
                {shift.teammates.map((t, idx) => (
                  <View
                    key={t.user_id}
                    style={[
                      styles.teammateRow,
                      idx === shift.teammates.length - 1 && {
                        borderBottomWidth: 0,
                      },
                    ]}
                  >
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>
                        {t.full_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.teammateInfo}>
                      <Text style={styles.teammateName}>
                        {t.full_name}
                      </Text>
                      <Text style={styles.teammateTime}>
                        {formatTimeRange(t.starts_at, t.ends_at)}
                        {t.role ? ` · ${t.role}` : ""}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Compañeros</Text>
              <View style={[styles.card, styles.emptyTeam]}>
                <Users size={24} stroke={colors.textTertiary} />
                <Text style={styles.emptyTeamText}>
                  Trabajas solo en este turno.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "600", color: colors.text },

  loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
  },
  errorText: {
    fontSize: 15,
    color: colors.error,
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryText: { color: "#fff", fontWeight: "600" },

  scroll: { paddingBottom: 40 },

  heroCard: {
    backgroundColor: colors.navy,
    paddingHorizontal: 24,
    paddingVertical: 28,
    gap: 6,
  },
  statusBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(52,211,153,0.2)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 8,
  },
  statusBadgeCancelled: {
    backgroundColor: "rgba(239,68,68,0.2)",
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#34D399",
  },
  statusBadgeTextCancelled: {
    color: "#FCA5A5",
  },
  heroDate: {
    fontSize: 16,
    color: "rgba(255,255,255,0.65)",
    textTransform: "capitalize",
  },
  heroTime: {
    fontSize: 34,
    fontWeight: "700",
    color: "#fff",
    lineHeight: 40,
  },
  heroDuration: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    marginTop: 4,
  },

  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
  },

  teammateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
  },
  teammateInfo: { flex: 1 },
  teammateName: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.text,
  },
  teammateTime: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyTeam: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
    flexDirection: "row",
    justifyContent: "center",
  },
  emptyTeamText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
