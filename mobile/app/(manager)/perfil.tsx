/**
 * Manager · Perfil
 * Datos del manager, restaurante activo y acceso al web dashboard.
 */
import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
} from "react-native";
import { router } from "expo-router";
import {
  User,
  Building2,
  ExternalLink,
  LogOut,
  ChevronRight,
  Shield,
} from "lucide-react-native";
import { useAuthStore } from "@/store/authStore";
import { colors } from "@/lib/colors";

function roleLabel(role: string | undefined): string {
  const map: Record<string, string> = {
    SUPERADMIN: "Super Admin",
    OWNER: "Propietario",
    MANAGER: "Manager",
    SUPERVISOR: "Supervisor",
  };
  return map[role ?? ""] ?? role ?? "—";
}

type MenuItemProps = {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  onPress: () => void;
  destructive?: boolean;
};

function MenuItem({ icon, label, subtitle, onPress, destructive }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.menuIcon}>{icon}</View>
      <View style={styles.menuText}>
        <Text style={[styles.menuLabel, destructive && { color: colors.error }]}>{label}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      <ChevronRight size={18} stroke={colors.textTertiary} strokeWidth={2} />
    </TouchableOpacity>
  );
}

export default function ManagerPerfil() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert("Cerrar sesión", "¿Seguro que quieres salir?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar sesión",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  const openWebDashboard = () => {
    // En producción esto apuntaría al dominio real del tenant
    void Linking.openURL("https://app.restaurantos.io/dashboard");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* User card */}
      <View style={styles.userCard}>
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>
            {(user?.full_name ?? "?")
              .split(" ")
              .slice(0, 2)
              .map((w) => w[0])
              .join("")
              .toUpperCase()}
          </Text>
        </View>
        <View>
          <Text style={styles.userName}>{user?.full_name ?? "—"}</Text>
          <Text style={styles.userEmail}>{user?.email ?? "—"}</Text>
          <View style={styles.roleBadge}>
            <Shield size={12} stroke={colors.primary} strokeWidth={2} />
            <Text style={styles.roleText}>{roleLabel(user?.role)}</Text>
          </View>
        </View>
      </View>

      {/* Restaurant info */}
      {user?.restaurant_name && (
        <View style={styles.infoCard}>
          <Building2 size={18} stroke={colors.textSecondary} strokeWidth={2} />
          <View style={styles.infoText}>
            <Text style={styles.infoLabel}>Restaurante activo</Text>
            <Text style={styles.infoValue}>{user.restaurant_name}</Text>
          </View>
        </View>
      )}

      {/* Actions */}
      <Text style={styles.sectionTitle}>Acciones</Text>
      <View style={styles.menuCard}>
        <MenuItem
          icon={<ExternalLink size={18} stroke={colors.primary} strokeWidth={2} />}
          label="Abrir panel web"
          subtitle="Dashboard completo en el navegador"
          onPress={openWebDashboard}
        />
      </View>

      <View style={styles.menuCard}>
        <MenuItem
          icon={<LogOut size={18} stroke={colors.error} strokeWidth={2} />}
          label="Cerrar sesión"
          onPress={handleLogout}
          destructive
        />
      </View>

      <Text style={styles.version}>RestaurantOS · Studio32</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 48 },

  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 12,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarText: { fontSize: 20, fontWeight: "700", color: colors.primary },
  userName: { fontSize: 17, fontWeight: "700", color: colors.text },
  userEmail: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 5,
    backgroundColor: colors.primaryLight,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleText: { fontSize: 11, color: colors.primary, fontWeight: "600" },

  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 20,
  },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 11, color: colors.textSecondary },
  infoValue: { fontSize: 15, fontWeight: "600", color: colors.text, marginTop: 1 },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: 10,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  menuIcon: { width: 32, alignItems: "center" },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: "500", color: colors.text },
  menuSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },

  version: {
    textAlign: "center",
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 20,
  },
});
