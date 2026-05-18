import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { CheckCircle } from "lucide-react-native";
import { reportIncident, type IncidentPayload } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useClockStore } from "@/store/clockStore";
import { ErrorBanner } from "@/components/ErrorBanner";
import { colors } from "@/lib/colors";

const INCIDENT_TYPES: {
  value: IncidentPayload["type"];
  label: string;
  description: string;
}[] = [
  {
    value: "FORGOT_CLOCK_OUT",
    label: "Olvidé fichar salida",
    description: "No pulsé el botón de salida al acabar el turno.",
  },
  {
    value: "FORGOT_CLOCK_IN",
    label: "Olvidé fichar entrada",
    description: "Empecé el turno pero no registré la entrada.",
  },
  {
    value: "WRONG_TIME",
    label: "Hora incorrecta",
    description: "El fichaje registró una hora errónea.",
  },
  {
    value: "OTHER",
    label: "Otro motivo",
    description: "Cualquier otro problema con mis registros.",
  },
];

export default function IncidentsScreen() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const currentSessionId = useClockStore((s) => s.status?.work_session_id);

  const [type, setType] = useState<IncidentPayload["type"] | null>(
    null
  );
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (!token) return;
    if (!user?.primary_restaurant_id) {
      setError("Tu cuenta no tiene una sucursal asignada. Avísale a tu manager.");
      return;
    }
    if (!type) {
      setError("Selecciona el tipo de incidencia.");
      return;
    }
    if (description.trim().length < 10) {
      setError("Describe la incidencia con al menos 10 caracteres.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await reportIncident(token, {
        restaurant_id: user.primary_restaurant_id,
        type,
        affected_date: new Date().toISOString().slice(0, 10),
        description: description.trim(),
        ...(currentSessionId ? { related_work_session_id: currentSessionId } : {}),
      });
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al enviar.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setType(null);
    setDescription("");
    setError(null);
    setSent(false);
  }

  if (sent) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successWrap}>
          <CheckCircle size={64} stroke={colors.success} strokeWidth={1.5} />
          <Text style={styles.successTitle}>Incidencia enviada</Text>
          <Text style={styles.successSub}>
            Tu manager la revisará en cuanto pueda. Recibirás confirmación cuando
            esté corregida.
          </Text>
          <Pressable style={styles.btn} onPress={handleReset}>
            <Text style={styles.btnText}>Reportar otra</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Reportar incidencia</Text>
          <Text style={styles.subtitle}>
            Avisa a tu manager de cualquier problema con tus fichajes.
          </Text>

          <ErrorBanner message={error} onDismiss={() => setError(null)} />

          {/* Tipo de incidencia */}
          <Text style={styles.sectionLabel}>¿Qué ha pasado?</Text>
          <View style={styles.typeList}>
            {INCIDENT_TYPES.map((t) => (
              <Pressable
                key={t.value}
                onPress={() => setType(t.value)}
                style={[
                  styles.typeCard,
                  type === t.value && styles.typeCardSelected,
                ]}
              >
                <Text
                  style={[
                    styles.typeLabel,
                    type === t.value && styles.typeLabelSelected,
                  ]}
                >
                  {t.label}
                </Text>
                <Text
                  style={[
                    styles.typeDesc,
                    type === t.value && styles.typeDescSelected,
                  ]}
                >
                  {t.description}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Descripción */}
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
            Cuéntanos más
          </Text>
          <TextInput
            style={styles.textarea}
            value={description}
            onChangeText={setDescription}
            placeholder="Ej: Ayer salí a las 22:00 pero olvidé fichar..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!loading}
          />

          <Pressable
            style={[styles.btn, loading && styles.btnLoading]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Enviar incidencia</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  container: {
    padding: 20,
    paddingTop: 28,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 10,
  },
  typeList: {
    gap: 10,
  },
  typeCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  typeCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  typeLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 3,
  },
  typeLabelSelected: {
    color: colors.primary,
  },
  typeDesc: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  typeDescSelected: {
    color: colors.primary,
  },
  textarea: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    minHeight: 120,
    lineHeight: 22,
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 22,
  },
  btnLoading: { opacity: 0.7 },
  btnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  // success
  successWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginTop: 20,
    marginBottom: 12,
  },
  successSub: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
});
