import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MapPin, Briefcase, ChevronRight } from "lucide-react-native";

import { colors } from "@/lib/colors";
import {
  formatDayLabel,
  formatDayNumber,
  formatMonthShort,
  formatTimeRange,
  formatElapsed,
} from "@/lib/format";
import type { Shift } from "@/lib/api";

type Props = {
  shift: Shift;
  onPress?: () => void;
};

export function UpcomingShiftCard({ shift, onPress }: Props) {
  const dayLabel = formatDayLabel(shift.starts_at);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {/* Calendario lateral */}
      <View style={styles.dateBlock}>
        <Text style={styles.dayNumber}>{formatDayNumber(shift.starts_at)}</Text>
        <Text style={styles.monthLabel}>{formatMonthShort(shift.starts_at)}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.dayLabel}>{capitalize(dayLabel)}</Text>
          <Text style={styles.duration}>{formatElapsed(shift.duration_minutes)}</Text>
        </View>

        <Text style={styles.time}>{formatTimeRange(shift.starts_at, shift.ends_at)}</Text>

        <View style={styles.metaRow}>
          <MapPin size={13} stroke={colors.textTertiary} />
          <Text style={styles.metaText} numberOfLines={1}>
            {shift.restaurant_name ?? "—"}
          </Text>
        </View>
        {shift.role && (
          <View style={styles.metaRow}>
            <Briefcase size={13} stroke={colors.textTertiary} />
            <Text style={styles.metaText}>{shift.role}</Text>
          </View>
        )}
      </View>

      {onPress && (
        <View style={styles.chevron}>
          <ChevronRight size={18} stroke={colors.textTertiary} />
        </View>
      )}
    </Pressable>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    overflow: "hidden",
  },
  pressed: {
    opacity: 0.7,
  },
  dateBlock: {
    width: 64,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryLight,
    paddingVertical: 12,
  },
  dayNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
    lineHeight: 28,
  },
  monthLabel: {
    fontSize: 11,
    color: colors.primary,
    textTransform: "uppercase",
    fontWeight: "600",
    marginTop: 2,
  },
  divider: {
    width: 1,
    backgroundColor: colors.border,
  },
  content: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  duration: {
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: "500",
  },
  time: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  metaText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  chevron: {
    justifyContent: "center",
    paddingRight: 8,
  },
});
