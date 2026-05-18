import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { Tablet, CheckCircle, ChevronRight, RefreshCw } from "lucide-react-native";
import { login, getRestaurants, type Restaurant } from "@/lib/api";
import { saveKioskBranch } from "@/lib/auth";
import { useAuthStore } from "@/store/authStore";
import { ErrorBanner } from "@/components/ErrorBanner";
import { colors } from "@/lib/colors";

type Step = "credentials" | "branch";

export default function KioskSetupScreen() {
  const setKioskMode = useAuthStore((s) => s.setKioskMode);

  // ── Paso 1: credenciales ───────────────────────────────────────────────────
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Token temporal (solo para cargar sucursales, luego setKioskMode lo usará)
  const [tempToken, setTempToken] = useState<string | null>(null);

  // ── Paso 2: sucursales ─────────────────────────────────────────────────────
  const [branches, setBranches] = useState<Restaurant[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);

  // ── Paso 1: login del manager ──────────────────────────────────────────────
  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError("Introduce el email y contraseña del manager.");
      return;
    }
    setLoginLoading(true);
    setError(null);
    try {
      const res = await login({ email: email.trim(), password });
      setTempToken(res.access_token);
      await loadBranches(res.access_token);
      setStep("branch");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al iniciar sesión.";
      setError(msg === "HTTP 401" ? "Credenciales incorrectas." : msg);
    } finally {
      setLoginLoading(false);
    }
  }

  async function loadBranches(token: string) {
    setLoadingBranches(true);
    try {
      const data = await getRestaurants(token);
      setBranches(data);
    } catch {
      // Si falla la carga, mostramos lista vacía — el usuario verá el empty state
      setBranches([]);
    } finally {
      setLoadingBranches(false);
    }
  }

  // ── Paso 2: activar kiosk ──────────────────────────────────────────────────
  async function handleActivate() {
    if (!tempToken || !selectedBranch) return;
    const branch = branches.find((b) => b.id === selectedBranch);
    if (!branch) return;
    setActivating(true);
    setError(null);
    try {
      await saveKioskBranch({ id: branch.id, name: branch.name });
      await setKioskMode(tempToken);
      router.replace("/kiosk");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al activar el kiosk.");
      setActivating(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Cabecera */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Tablet size={36} color="#fff" strokeWidth={1.5} />
          </View>
          <Text style={styles.title}>Configurar kiosk</Text>
          <Text style={styles.subtitle}>
            {step === "credentials"
              ? "Inicia sesión con una cuenta manager para activar esta tablet como punto de fichaje."
              : "Selecciona la sucursal en la que está instalada esta tablet."}
          </Text>
        </View>

        {/* Indicador de paso */}
        <View style={styles.stepRow}>
          <View style={[styles.stepDot, step === "credentials" && styles.stepDotActive]} />
          <View style={styles.stepLine} />
          <View style={[styles.stepDot, step === "branch" && styles.stepDotActive]} />
        </View>

        <ErrorBanner message={error} onDismiss={() => setError(null)} />

        {/* ── Paso 1: Credenciales ────────────────────────────────────────── */}
        {step === "credentials" && (
          <View style={styles.card}>
            <Text style={styles.label}>Email del manager</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="manager@restaurante.com"
              placeholderTextColor={colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loginLoading}
              returnKeyType="next"
            />

            <Text style={[styles.label, { marginTop: 14 }]}>Contraseña</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              editable={!loginLoading}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />

            <Pressable
              style={[styles.btn, loginLoading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loginLoading}
            >
              {loginLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.btnInner}>
                  <Text style={styles.btnText}>Continuar</Text>
                  <ChevronRight size={20} color="#fff" />
                </View>
              )}
            </Pressable>
          </View>
        )}

        {/* ── Paso 2: Selección de sucursal ───────────────────────────────── */}
        {step === "branch" && (
          <View style={styles.card}>
            {loadingBranches ? (
              <View style={styles.branchLoading}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.branchLoadingText}>Cargando sucursales…</Text>
              </View>
            ) : branches.length === 0 ? (
              <View style={styles.branchEmpty}>
                <Text style={styles.branchEmptyText}>
                  No se encontraron sucursales. Comprueba la conexión e inténtalo de nuevo.
                </Text>
                <Pressable
                  style={styles.retryBtn}
                  onPress={() => tempToken && loadBranches(tempToken)}
                >
                  <RefreshCw size={16} color={colors.primary} />
                  <Text style={styles.retryText}>Reintentar</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text style={styles.label}>Sucursal</Text>
                <View style={styles.branchList}>
                  {branches.map((branch) => {
                    const selected = selectedBranch === branch.id;
                    return (
                      <Pressable
                        key={branch.id}
                        style={[styles.branchCard, selected && styles.branchSelected]}
                        onPress={() => setSelectedBranch(branch.id)}
                      >
                        <View style={styles.branchInfo}>
                          <Text
                            style={[
                              styles.branchLabel,
                              selected && styles.branchLabelSelected,
                            ]}
                          >
                            {branch.name}
                          </Text>
                          {branch.address ? (
                            <Text
                              style={[
                                styles.branchAddress,
                                selected && styles.branchAddressSelected,
                              ]}
                            >
                              {branch.address}
                            </Text>
                          ) : null}
                        </View>
                        {selected && (
                          <CheckCircle size={20} color={colors.primary} />
                        )}
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable
                  style={[
                    styles.btn,
                    (!selectedBranch || activating) && styles.btnDisabled,
                  ]}
                  onPress={handleActivate}
                  disabled={!selectedBranch || activating}
                >
                  {activating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnText}>Activar kiosk</Text>
                  )}
                </Pressable>
              </>
            )}
          </View>
        )}

        {/* Volver */}
        <Pressable
          style={styles.back}
          onPress={() => {
            if (step === "branch") {
              setStep("credentials");
              setSelectedBranch(null);
              setBranches([]);
              setTempToken(null);
              setError(null);
            } else {
              router.back();
            }
          }}
        >
          <Text style={styles.backText}>
            {step === "branch" ? "← Cambiar credenciales" : "← Volver al login de empleado"}
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
    padding: 24,
    paddingTop: 48,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  // Indicador de pasos
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    gap: 0,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 6,
  },
  // Card
  card: {
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
  // Sucursales
  branchList: {
    gap: 8,
    marginBottom: 4,
  },
  branchCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  branchSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  branchInfo: {
    flex: 1,
    marginRight: 8,
  },
  branchLabel: {
    fontSize: 15,
    color: colors.text,
    fontWeight: "500",
  },
  branchLabelSelected: {
    color: colors.primary,
  },
  branchAddress: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
  },
  branchAddressSelected: {
    color: colors.primary,
    opacity: 0.7,
  },
  branchLoading: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 12,
  },
  branchLoadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  branchEmpty: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 12,
  },
  branchEmptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  retryText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "500",
  },
  // Botón principal
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 22,
  },
  btnDisabled: { opacity: 0.4 },
  btnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  btnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  // Volver
  back: {
    alignItems: "center",
    marginTop: 20,
    paddingVertical: 8,
  },
  backText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
