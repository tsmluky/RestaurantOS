import React, { useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  Mail,
  Building2,
  LogOut,
  ChevronRight,
  Shield,
  Clock,
  AlertCircle,
} from "lucide-react-native";
import { useAuthStore } from "@/store/authStore";
import { colors } from "@/lib/colors";

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [loggingOut, setLoggingOut] = useState(false);

  function handleLogout() {
    Alert.alert(
      "Cerrar sesión",
      "¿Seguro que quieres salir?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar sesión",
          style: "destructive",
          onPress: async () => {
            setLoggingOut(true);
            await logout();
            router.replace("/login");
          },
        },
      ]
    );
  }

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("")
    : "?";

  const roleLabel =
    user?.role === "MANAGER" || user?.role === "OWNER" ? "Manager" : "Empleado";

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Navy header with avatar ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi perfil</Text>
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.userName}>{user?.full_name ?? "—"}</Text>
          <View style={styles.roleBadge}>
            <Shield size={12} stroke="rgba(255,255,255,0.8)" />
            <Text style={styles.roleText}>{roleLabel}</Text>
          </View>
        </View>
      </View>

      {/* ── Body ── */}
      <View style={styles.body}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Info card — overlaps header */}
          <View style={styles.infoCard}>
            <InfoRow
              icon={<Mail size={18} stroke={colors.primary} />}
              label="Email"
              value={user?.email ?? "—"}
            />
            <InfoRow
              icon={<Building2 size={18} stroke={colors.primary} />}
              label="Sucursal"
              value={user?.restaurant_name ?? "Sin asignar"}
              last
            />
          </View>

          {/* Accesos rápidos */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ACCESOS RÁPIDOS</Text>
            <View style={styles.card}>
              <Pressable
                style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}
                onPress={() => router.push("/(employee)/history")}
              >
                <View style={[styles.menuIconWrap, { backgroundColor: colors.primaryLight }]}>
                  <Clock size={18} stroke={colors.primary} />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuText}>Historial de fichajes</Text>
                  <Text style={styles.menuSubtext}>Tus últimos turnos trabajados</Text>
                </View>
                <ChevronRight size={18} stroke={colors.textTertiary} />
              </Pressable>

              <View style={styles.divider} />

              <Pressable
                style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}
                onPress={() => router.push("/(employee)/incidents")}
              >
                <View style={[styles.menuIconWrap, { backgroundColor: colors.warningLight }]}>
                  <AlertCircle size={18} stroke={colors.warning} />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuText}>Reportar incidencia</Text>
                  <Text style={styles.menuSubtext}>Olvido de fichaje u hora incorrecta</Text>
                </View>
                <ChevronRight size={18} stroke={colors.textTertiary} />
              </Pressable>
            </View>
          </View>

          {/* Cerrar sesión */}
          <View style={styles.section}>
            <View style={styles.card}>
              <Pressable
                style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}
                onPress={handleLogout}
                disabled={loggingOut}
              >
                <View style={[styles.menuIconWrap, { backgroundColor: colors.errorLight }]}>
                  <LogOut size={18} stroke={colors.error} />
                </View>
                <Text style={styles.logoutText}>
                  {loggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
                </Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.version}>RestaurantOS · v0.1.0</Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[infoRow.wrap, last && infoRow.wrapLast]}>
      <View style={infoRow.iconWrap}>{icon}</View>
      <View style={infoRow.content}>
        <Text style={infoRow.label}>{label}</Text>
        <Text style={infoRow.value}>{value}</Text>
      </View>
    </View>
  );
}

const infoRow = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  wrapLast: {
    borderBottomWidth: 0,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { flex: 1 },
  label: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: "500",
    marginBottom: 2,
  },
  value: {
    fontSize: 15,
    color: colors.text,
    fontWeight: "500",
  },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.navy,
  },
  header: {
    backgroundColor: colors.navy,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 44,
    alignItems: "center",
  },
  headerTitle: {
    alignSelf: "flex-start",
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 20,
  },
  avatarSection: {
    alignItems: "center",
    gap: 8,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: "700",
    color: "#fff",
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "600",
  },
  body: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 48,
  },
  infoCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: -24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    overflow: "hidden",
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowPressed: {
    backgroundColor: colors.divider,
  },
  menuIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuContent: {
    flex: 1,
  },
  menuText: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.text,
  },
  menuSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginHorizontal: 14,
  },
  logoutText: {
    fontSize: 15,
    color: colors.error,
    fontWeight: "500",
    flex: 1,
  },
  version: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: "center",
    marginTop: 32,
  },
});
