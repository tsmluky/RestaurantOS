import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Clock, AlertTriangle, CheckCircle, MinusCircle } from "lucide-react-native";
import { colors } from "@/lib/colors";
import { formatElapsed, formatTime, statusLabel } from "@/lib/format";
import type { ClockStatus } from "@/lib/api";

type Props = {
  status: ClockStatus;
};

type StatusStyle = {
  bg: string;
  border: string;
  label: string;
  icon: React.ReactNode;
};

function getStatusStyle(status: ClockStatus["status"]): StatusStyle {
  switch (status) {
    case "CLOCKED_IN":
      return {
        bg: colors.successLight,
        border: "#86EFAC",
        label: statusLabel(status),
        icon: <CheckCircle size={20} stroke={colors.success} />,
      };
    case "MISSING_CLOCK_OUT":
      return {
        bg: colors.warningLight,
        border: "#FDE68A",
        label: statusLabel(status),
        icon: <AlertTriangle size={20} stroke={colors.warning} />,
      };
    case "NEEDS_REVIEW":
      return {
        bg: colors.errorLight,
        border: "#FECACA",
        label: statusLabel(status),
        icon: <AlertTriangle size={20} stroke={colors.error} />,
      };
    default:
      return {
        bg: colors.divider,
        border: colors.border,
        label: statusLabel(status),
        icon: <MinusCircle size={20} stroke={colors.textTertiary} />,
      };
  }
}

export function StatusCard({ status }: Props) {
  const style = getStatusStyle(status.status);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: style.bg, borderColor: style.border },
      ]}
    >
      {/* Borde lateral de color */}
      <View
        style={[
          styles.leftBorder,
          {
            backgroundColor:
              status.status === "CLOCKED_IN"
                ? colors.success
                : status.status === "MISSING_CLOCK_OUT"
                ? colors.warning
                : status.status === "NEEDS_REVIEW"
                ? colors.error
                : colors.textTertiary,
          },
        ]}
      />

      <View style={styles.content}>
        <View style={styles.header}>
          {style.icon}
          <Text style={styles.statusLabel}>{style.label}</Text>
        </View>

        {status.status === "CLOCKED_IN" && status.clock_in_at && (
          <View style={styles.details}>
            <View style={styles.detailRow}>
              <Clock size={14} stroke={colors.textSecondary} />
              <Text style={styles.detailText}>
                Entrada: {formatTime(status.clock_in_at)}
              </Text>
            </View>
            {status.elapsed_minutes !== null && (
              <View style={styles.detailRow}>
                <Text style={styles.elapsed}>
                  {formatElapsed(status.elapsed_minutes)} trabajados
                </Text>
              </View>
            )}
          </View>
        )}

        {status.status === "OFF_DUTY" && (
          <Text style={styles.subtitle}>Sin turno activo ahora mismo</Text>
        )}

        {status.pending_incidents > 0 && (
          <Text style={styles.incidents}>
            {status.pending_incidents} incidencia
            {status.pending_incidents > 1 ? "s" : ""} pendiente
            {status.pending_incidents > 1 ? "s" : ""}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 20,
  },
  leftBorder: {
    width: 5,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  details: {
    gap: 4,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  elapsed: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.success,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  incidents: {
    fontSize: 13,
    color: colors.warning,
    marginTop: 6,
    fontWeight: "500",
  },
});
