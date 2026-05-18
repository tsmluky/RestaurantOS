import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Clock } from "lucide-react-native";
import { getMyHistory, type WorkSession } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { WorkSessionCard } from "@/components/WorkSessionCard";
import { ErrorBanner } from "@/components/ErrorBanner";
import { colors } from "@/lib/colors";

export default function HistoryScreen() {
  const token = useAuthStore((s) => s.token);

  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getMyHistory(token);
      // Más reciente primero
      setSessions([...data].sort(
        (a, b) =>
          new Date(b.clock_in_at).getTime() - new Date(a.clock_in_at).getTime()
      ));
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
      <View style={styles.titleRow}>
        <Text style={styles.title}>Mis registros</Text>
      </View>

      <ErrorBanner
        message={error}
        onDismiss={() => setError(null)}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
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
              <Clock size={48} stroke={colors.textTertiary} strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>Sin registros todavía</Text>
              <Text style={styles.emptySubtitle}>
                Aquí aparecerán tus fichajes cuando empieces a trabajar.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  titleRow: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: "center",
    lineHeight: 20,
  },
});
