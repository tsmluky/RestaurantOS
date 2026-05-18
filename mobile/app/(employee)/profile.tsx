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
  User,
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
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Mi perfil</Text>

        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
          <Text style={styles.userName}>{user?.full_name ?? "—"}</Text>
          <View style={styles.roleBadge}>
            <Shield size={13} stroke={colors.primary} />
            <Text style={styles.roleText}>
              {user?.role === "MANAGER" || user?.role === "OWNER" ? "Manager" : "Empleado"}
            </Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.section}>
          <InfoRow icon={<Mail size={18} stroke={colors.textSecondary} />} label="Email" value={user?.email ?? "—"} />
          {user?.restaurant_name ? (
            <InfoRow
              icon={<Building2 size={18} stroke={colors.textSecondary} />}
              label="Sucursal"
              value={user.restaurant_name}
            />
          ) : null}
        </View>

        {/* Accesos */}
        <View style={[styles.section, { marginTop: 16 }]}>
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => router.push("/(employee)/history")}
          >
            <Clock size={20} stroke={colors.textSecondary} />
            <View style={styles.rowContent}>
              <Text style={styles.actionText}>Historial de fichajes</Text>
              <Text style={styles.actionSubtext}>
                Tus últimos turnos trabajados
              </Text>
            </View>
            <ChevronRight size={18} stroke={colors.textTertiary} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.row,
              styles.lastRow,
              pressed && styles.rowPressed,
            ]}
            onPress={() => router.push("/(employee)/incidents")}
          >
            <AlertCircle size={20} stroke={colors.textSecondary} />
            <View style={styles.rowContent}>
              <Text style={styles.actionText}>Reportar incidencia</Text>
              <Text style={styles.actionSubtext}>
                Olvido de fichaje u hora incorrecta
              </Text>
            </View>
            <ChevronRight size={18} stroke={colors.textTertiary} />
          </Pressable>
        </View>

        {/* Cerrar sesión */}
        <View style={[styles.section, { marginTop: 16 }]}>
          <Pressable
            style={({ pressed }) => [
              styles.row,
              styles.logoutRow,
              pressed && styles.rowPressed,
            ]}
            onPress={handleLogout}
            disabled={loggingOut}
          >
            <LogOut size={20} stroke={colors.error} />
            <Text style={styles.logoutText}>
              {loggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
            </Text>
          </Pressable>
        </View>

        {/* Versión */}
        <Text style={styles.version}>RestaurantOS · v0.1.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

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
    <View style={styles.row}>
      {icon}
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: {
    padding: 20,
    paddingTop: 28,
    paddingBottom: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 28,
  },
  avatarWrap: {
    alignItems: "center",
    marginBottom: 28,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  initials: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: "500",
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  rowPressed: {
    backgroundColor: colors.divider,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 1,
  },
  rowValue: {
    fontSize: 15,
    color: colors.text,
    fontWeight: "500",
  },
  logoutRow: {
    borderBottomWidth: 0,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  actionText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: "500",
  },
  actionSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  logoutText: {
    fontSize: 16,
    color: colors.error,
    fontWeight: "500",
  },
  version: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: "center",
    marginTop: 28,
  },
});
