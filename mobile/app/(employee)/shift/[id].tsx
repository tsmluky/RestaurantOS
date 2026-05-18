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
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Clock,
  MapPin,
  Briefcase,
  Users,
  StickyNote,
} from "lucide-react-native";

import { getShiftDetail, type ShiftWithTeammates } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { colors } from "@/lib/colors";
import {
  formatDayLabel,
  formatTimeRange,
  formatElapsed,
} from "@/lib/format";

export default function ShiftDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const token = useAuthStore((s) => s.token);

  const [shift, setShift] = useState<ShiftWithTeammates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getShiftDetail(token, id);
      setShift(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar el turno.");
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.headerBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <ArrowLeft size={22} stroke={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Detalle del turno</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : error || !shift ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error ?? "Turno no disponible"}</Text>
          </View>
        ) : (
          <>
            {/* Cabecera con día */}
            <View style={styles.dayBlock}>
              <Text style={styles.dayLabel}>
                {capitalize(formatDayLabel(shift.starts_at))}
              </Text>
              <Text style={styles.fullDate}>
                {new Date(shift.starts_at).toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            </View>

            {/* Card principal */}
            <View style={styles.mainCard}>
              <View style={styles.row}>
                <Clock size={18} stroke={colors.primary} />
                <View style={styles.rowContent}>
                  <Text style={styles.rowLabel}>Horario</Text>
                  <Text style={styles.rowValue}>
                    {formatTimeRange(shift.starts_at, shift.ends_at)}
                  </Text>
                  <Text style={styles.rowSub}>
                    {formatElapsed(shift.duration_minutes)} de turno
                  </Text>
                </View>
              </View>

              <View style={styles.separator} />

              <View style={styles.row}>
                <MapPin size={18} stroke={colors.primary} />
                <View style={styles.rowContent}>
                  <Text style={styles.rowLabel}>Sucursal</Text>
                  <Text style={styles.rowValue}>
                    {shift.restaurant_name ?? "—"}
                  </Text>
                </View>
              </View>

              {shift.role && (
                <>
                  <View style={styles.separator} />
                  <View style={styles.row}>
                    <Briefcase size={18} stroke={colors.primary} />
                    <View style={styles.rowContent}>
                      <Text style={styles.rowLabel}>Puesto</Text>
                      <Text style={styles.rowValue}>{shift.role}</Text>
                    </View>
                  </View>
                </>
              )}

              {shift.notes && (
                <>
                  <View style={styles.separator} />
                  <View style={styles.row}>
                    <StickyNote size={18} stroke={colors.primary} />
                    <View style={styles.rowContent}>
                      <Text style={styles.rowLabel}>Notas</Text>
                      <Text style={styles.rowNotes}>{shift.notes}</Text>
                    </View>
                  </View>
                </>
              )}
            </View>

            {/* Compañeros */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Users size={18} stroke={colors.text} />
                <Text style={styles.sectionTitle}>
                  Compañeros en este turno ({shift.teammates.length})
                </Text>
              </View>

              {shift.teammates.length === 0 ? (
                <View style={styles.emptyTeammates}>
                  <Text style={styles.emptyTeammatesText}>
                    Eres la única persona programada en este turno.
                  </Text>
                </View>
              ) : (
                shift.teammates.map((t) => (
                  <View key={t.user_id} style={styles.teammateCard}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {initials(t.full_name)}
                      </Text>
                    </View>
                    <View style={styles.teammateInfo}>
                      <Text style={styles.teammateName}>{t.full_name}</Text>
                      <Text style={styles.teammateRole}>
                        {formatTimeRange(t.starts_at, t.ends_at)}
                        {t.role ? ` · ${t.role}` : ""}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  center: {
    paddingVertical: 60,
    alignItems: "center",
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
  },
  dayBlock: {
    marginBottom: 16,
  },
  dayLabel: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
  },
  fullDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  mainCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 10,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: "uppercase",
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  rowValue: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.text,
    marginTop: 2,
  },
  rowSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rowNotes: {
    fontSize: 14,
    color: colors.text,
    marginTop: 2,
    lineHeight: 20,
  },
  separator: {
    height: 1,
    backgroundColor: colors.divider,
    marginLeft: 30,
  },
  section: {
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  emptyTeammates: {
    backgroundColor: colors.divider,
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
  },
  emptyTeammatesText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
  },
  teammateCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 12,
    marginBottom: 8,
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
  teammateInfo: {
    flex: 1,
  },
  teammateName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  teammateRole: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.6,
  },
});
