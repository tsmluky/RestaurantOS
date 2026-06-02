import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { ChefHat } from "lucide-react-native";
import { login } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { ErrorBanner } from "@/components/ErrorBanner";
import { colors } from "@/lib/colors";

export default function LoginScreen() {
  const loginEmployee = useAuthStore((s) => s.loginEmployee);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError("Introduce tu email y contraseña.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await login({ email: email.trim(), password });
      await loginEmployee(res.access_token);
      router.replace("/(employee)");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al iniciar sesión.";
      setError(msg === "HTTP 401" ? "Email o contraseña incorrectos." : msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <ChefHat size={40} color="#fff" strokeWidth={1.5} />
          </View>
          <Text style={styles.appName}>RestaurantOS</Text>
          <Text style={styles.tagline}>Control de horarios para tu equipo</Text>
        </View>

        {/* Formulario */}
        <View style={styles.form}>
          <ErrorBanner message={error} onDismiss={() => setError(null)} />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="tu@email.com"
            placeholderTextColor={colors.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            editable={!loading}
          />

          <Text style={[styles.label, { marginTop: 14 }]}>Contraseña</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.textTertiary}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            editable={!loading}
          />

          <Pressable
            style={({ pressed }) => [
              styles.btn,
              pressed && styles.btnPressed,
              loading && styles.btnLoading,
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Entrar</Text>
            )}
          </Pressable>
        </View>

        {/* Acceso kiosk */}
        <Pressable
          style={styles.kioskLink}
          onPress={() => router.push("/kiosk/setup")}
        >
          <Text style={styles.kioskText}>
            ¿Configurar como tablet/kiosk? →
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 28,
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  appName: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.text,
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 22,
  },
  btnPressed: {
    backgroundColor: colors.primaryDark,
  },
  btnLoading: {
    opacity: 0.7,
  },
  btnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  kioskLink: {
    alignItems: "center",
    marginTop: 24,
    paddingVertical: 8,
  },
  kioskText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
