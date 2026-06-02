import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Clock } from "lucide-react-native";
import { getMyHistory, type WorkSession } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { WorkSessionCard } from "@/components/WorkSessionCard";
import { ErrorBanner } from "@/components/ErrorBanner";
import { colors } from "@/lib/colors";

export default function HistoryScreen() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getMyHistory(token);
      setSessions(
        [...data].sort(
          (a, b) =>
            new Date(b.clock_in_at).getTime() -
            new Date(a.clock_in_at).getTime()
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar historial.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  }, [fetchHistory]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Navy header ── */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <ArrowLeft size={22} stroke="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Mis registros</Text>
        <View style={styles.backBtn} />
      </View>

      {/* ── Body ── */}
      <View style={styles.body}>
        {error ? (
          <View style={styles.errorWrap}>
            <ErrorBanner message={error} onDismiss={() => setError(null)} />
          </View>
        ) : null}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <FlatList
            data={sessions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <WorkSessionCard session={item} />}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Clock
                  size={48}
                  stroke={colors.textTertiary}
                  strokeWidth={1.5}
                />
                <Text style={styles.emptyTitle}>Sin registros todavía</Text>
                <Text style={styles.emptySubtitle}>
                  Aquí aparecerán tus fichajes cuando empieces a trabajar.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.navy,
  },
  header: {
    backgroundColor: colors.navy,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },
  body: {
    flex: 1,
    backgroundColor: colors.background,
  },
  errorWrap: {
    padding: 16,
    paddingBottom: 0,
  },
  list: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: "center",
    lineHeight: 20,
  },
});
