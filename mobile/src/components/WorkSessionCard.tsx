import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Clock, ArrowRight } from "lucide-react-native";
import { colors } from "@/lib/colors";
import { formatDateLong, formatTime, formatElapsed } from "@/lib/format";
import type { WorkSession } from "@/lib/api";

type Props = {
  session: WorkSession;
};

export function WorkSessionCard({ session }: Props) {
  const isComplete = session.clock_out_at !== null;

  return (
    <View style={[styles.card, !isComplete && styles.cardIncomplete]}>
      {/* Fecha */}
      <Text style={styles.date}>{formatDateLong(session.clock_in_at)}</Text>

      {/* Horario */}
      <View style={styles.timeRow}>
        <View style={styles.timeBlock}>
          <Text style={styles.timeLabel}>Entrada</Text>
          <Text style={styles.time}>{formatTime(session.clock_in_at)}</Text>
        </View>

        <ArrowRight size={18} stroke={colors.textTertiary} />

        <View style={styles.timeBlock}>
          <Text style={styles.timeLabel}>Salida</Text>
          <Text style={[styles.time, !isComplete && styles.timeMissing]}>
            {session.clock_out_at ? formatTime(session.clock_out_at) : "—"}
          </Text>
        </View>

        {/* Total */}
        <View style={[styles.totalBlock, isComplete ? styles.totalComplete : styles.totalPending]}>
          {isComplete && session.duration_minutes !== null ? (
            <>
              <Clock size={13} stroke={colors.success} />
              <Text style={styles.totalText}>
                {formatElapsed(session.duration_minutes)}
              </Text>
            </>
          ) : (
            <Text style={styles.pendingText}>Activo</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardIncomplete: {
    borderColor: "#86EFAC",
    backgroundColor: colors.successLight,
  },
  date: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 10,
    textTransform: "capitalize",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  timeBlock: {
    alignItems: "center",
  },
  timeLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  time: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  timeMissing: {
    color: colors.textTertiary,
  },
  totalBlock: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  totalComplete: {
    backgroundColor: colors.successLight,
  },
  totalPending: {
    backgroundColor: "#DBEAFE",
  },
  totalText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.success,
  },
  pendingText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
});
