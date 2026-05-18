import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  CheckCircle,
  XCircle,
  WifiOff,
  Settings,
} from "lucide-react-native";
import { kioskClock, generateIdempotencyKey, ApiError } from "@/lib/api";
import { getKioskBranch } from "@/lib/auth";
import { useAuthStore } from "@/store/authStore";
import { PinPad } from "@/components/PinPad";
import { colors } from "@/lib/colors";
import { formatTime, formatElapsed } from "@/lib/format";

type KioskState =
  | "idle"
  | "loading"
  | "success_in"
  | "success_out"
  | "error_pin"
  | "error_clocked"
  | "error_network"
  | "error_generic";

type KioskResultState = Exclude<KioskState, "idle" | "loading">;

const DISPLAY_DURATION = 4000; // ms

export default function KioskScreen() {
  const token = useAuthStore((s) => s.token);

  const [pin, setPin] = useState("");
  const [kioskState, setKioskState] = useState<KioskState>("idle");
  const [branchName, setBranchName] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [resultData, setResultData] = useState<{
    name: string;
    time?: string;
    total?: number;
  } | null>(null);

  useEffect(() => {
    void getKioskBranch().then((b) => {
      if (b) {
        setBranchName(b.name);
        setBranchId(b.id);
      }
    });
  }, []);

  // Volver a idle automáticamente tras mostrar resultado/error
  useEffect(() => {
    if (kioskState === "idle" || kioskState === "loading") return;
    const t = setTimeout(() => {
      setKioskState("idle");
      setPin("");
      setResultData(null);
    }, DISPLAY_DURATION);
    return () => clearTimeout(t);
  }, [kioskState]);

  async function handleSubmit() {
    if (!token || !branchId || pin.length < 4) return;
    setKioskState("loading");
    try {
      const res = await kioskClock(token, {
        employee_pin: pin,
        restaurant_id: branchId,
        action: "AUTO",
        idempotency_key: generateIdempotencyKey(),
      });
      setResultData({
        name: res.employee_name,
        time: res.event_at,
        total: res.duration_minutes ?? undefined,
      });
      setKioskState(res.status === "CLOCKED_IN" ? "success_in" : "success_out");
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401 || e.status === 404) {
          setKioskState("error_pin");
        } else if (e.status === 409) {
          setKioskState("error_clocked");
        } else if (e.status === 0 || e.message.includes("fetch")) {
          setKioskState("error_network");
        } else {
          setKioskState("error_generic");
        }
      } else {
        setKioskState("error_network");
      }
    } finally {
      setPin("");
    }
  }

  // ── Pantalla de resultado ─────────────────────────────────────────────────
  if (kioskState !== "idle" && kioskState !== "loading") {
    return <KioskResult state={kioskState} data={resultData} />;
  }

  // ── Pantalla principal ────────────────────────────────────────────────────
  const dots = Array.from({ length: 6 }).map((_, i) =>
    i < pin.length ? "●" : "○"
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Cabecera */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>RestaurantOS</Text>
        {branchName && (
          <Text style={styles.headerBranch}>{branchName}</Text>
        )}
        <Pressable
          style={styles.settingsBtn}
          onPress={() => router.push("/kiosk/setup")}
        >
          <Settings size={20} stroke={colors.textTertiary} />
        </Pressable>
      </View>

      {/* Indicación */}
      <View style={styles.promptWrap}>
        <Text style={styles.promptText}>Introduce tu PIN</Text>
        {/* Indicadores de dígitos */}
        <View style={styles.dots}>
          {dots.map((d, i) => (
            <Text
              key={i}
              style={[styles.dot, i < pin.length && styles.dotFilled]}
            >
              {d}
            </Text>
          ))}
        </View>
      </View>

      {/* Teclado */}
      <PinPad
        value={pin}
        onChange={setPin}
        maxLength={6}
        disabled={kioskState === "loading"}
      />

      {/* Confirmar */}
      <View style={styles.confirmWrap}>
        <Pressable
          style={[
            styles.confirmBtn,
            (pin.length < 4 || kioskState === "loading") && styles.confirmDisabled,
          ]}
          onPress={handleSubmit}
          disabled={pin.length < 4 || kioskState === "loading"}
        >
          {kioskState === "loading" ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmText}>Confirmar</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ── Pantalla de resultado ────────────────────────────────────────────────────

function KioskResult({
  state,
  data,
}: {
  state: KioskResultState;
  data: { name: string; time?: string; total?: number } | null;
}) {
  const isSuccess = state === "success_in" || state === "success_out";

  const config = {
    success_in: {
      icon: <CheckCircle size={80} stroke={colors.success} strokeWidth={1.5} />,
      bg: colors.successLight,
      title: `¡Bienvenido, ${data?.name ?? ""}!`,
      sub: data?.time ? `Entrada registrada a las ${formatTime(data.time)}` : "Entrada registrada",
      color: colors.success,
    },
    success_out: {
      icon: <CheckCircle size={80} stroke={colors.primary} strokeWidth={1.5} />,
      bg: colors.primaryLight,
      title: `¡Hasta pronto, ${data?.name ?? ""}!`,
      sub: data?.total != null
        ? `Has trabajado ${formatElapsed(data.total)} hoy`
        : data?.time
        ? `Salida registrada a las ${formatTime(data.time)}`
        : "Salida registrada",
      color: colors.primary,
    },
    error_pin: {
      icon: <XCircle size={80} stroke={colors.error} strokeWidth={1.5} />,
      bg: colors.errorLight,
      title: "PIN incorrecto",
      sub: "No se ha encontrado ningún empleado con ese PIN. Inténtalo de nuevo.",
      color: colors.error,
    },
    error_clocked: {
      icon: <XCircle size={80} stroke={colors.warning} strokeWidth={1.5} />,
      bg: colors.warningLight,
      title: "Ya estás fichado",
      sub: "Este empleado ya tiene un turno activo. Contacta con el manager si hay un error.",
      color: colors.warning,
    },
    error_network: {
      icon: <WifiOff size={80} stroke={colors.textSecondary} strokeWidth={1.5} />,
      bg: colors.divider,
      title: "Sin conexión",
      sub: "No hay conexión con el servidor. Comprueba el WiFi e inténtalo de nuevo.",
      color: colors.textSecondary,
    },
    error_generic: {
      icon: <XCircle size={80} stroke={colors.error} strokeWidth={1.5} />,
      bg: colors.errorLight,
      title: "Error inesperado",
      sub: "Ha ocurrido un error. Por favor, inténtalo de nuevo.",
      color: colors.error,
    },
  }[state];

  if (!config) return null;

  return (
    <View style={[styles.resultScreen, { backgroundColor: config.bg }]}>
      {config.icon}
      <Text style={[styles.resultTitle, { color: config.color }]}>
        {config.title}
      </Text>
      <Text style={styles.resultSub}>{config.sub}</Text>
    </View>
  );
}

// ── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
  },
  headerBranch: {
    fontSize: 14,
    color: colors.textSecondary,
    marginRight: 12,
  },
  settingsBtn: {
    padding: 6,
  },
  promptWrap: {
    alignItems: "center",
    paddingVertical: 40,
  },
  promptText: {
    fontSize: 24,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 24,
  },
  dots: {
    flexDirection: "row",
    gap: 14,
  },
  dot: {
    fontSize: 28,
    color: colors.textTertiary,
  },
  dotFilled: {
    color: colors.primary,
  },
  confirmWrap: {
    paddingHorizontal: 40,
    paddingTop: 28,
    paddingBottom: 20,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: "center",
  },
  confirmDisabled: {
    opacity: 0.4,
  },
  confirmText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  // resultado
  resultScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 24,
    marginBottom: 12,
  },
  resultSub: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
});
