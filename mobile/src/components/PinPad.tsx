import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Delete } from "lucide-react-native";
import { colors } from "@/lib/colors";

type Props = {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  disabled?: boolean;
};

const KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "DEL"],
];

export function PinPad({ value, onChange, maxLength = 6, disabled = false }: Props) {
  const handleKey = (key: string) => {
    if (disabled) return;
    if (key === "DEL") {
      onChange(value.slice(0, -1));
    } else if (key !== "" && value.length < maxLength) {
      onChange(value + key);
    }
  };

  return (
    <View style={styles.container}>
      {KEYS.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.row}>
          {row.map((key, colIdx) => {
            if (key === "") return <View key={colIdx} style={styles.empty} />;

            const isDel = key === "DEL";
            return (
              <Pressable
                key={colIdx}
                onPress={() => handleKey(key)}
                disabled={disabled}
                style={({ pressed }) => [
                  styles.key,
                  isDel && styles.keyDel,
                  pressed && !disabled && styles.keyPressed,
                  disabled && styles.keyDisabled,
                ]}
                accessibilityLabel={isDel ? "Borrar" : key}
              >
                {isDel ? (
                  <Delete size={26} stroke={colors.textSecondary} />
                ) : (
                  <Text style={styles.keyLabel}>{key}</Text>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 14,
  },
  key: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  keyDel: {
    backgroundColor: colors.divider,
    borderColor: colors.border,
  },
  keyPressed: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  keyDisabled: {
    opacity: 0.4,
  },
  keyLabel: {
    fontSize: 28,
    fontWeight: "400",
    color: colors.text,
  },
  empty: {
    width: 88,
    height: 88,
  },
});
