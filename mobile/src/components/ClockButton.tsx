import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LogIn, LogOut } from "lucide-react-native";
import { colors } from "@/lib/colors";

type ClockAction = "in" | "out";

type Props = {
  action: ClockAction;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

export function ClockButton({ action, onPress, loading = false, disabled = false }: Props) {
  const isIn = action === "in";
  const bgColor = isIn ? colors.primary : colors.error;
  const bgColorPressed = isIn ? colors.primaryDark : "#B91C1C";
  const label = isIn ? "Fichar entrada" : "Fichar salida";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: pressed ? bgColorPressed : bgColor },
        (disabled || loading) && styles.disabled,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <View style={styles.inner}>
          {isIn ? (
            <LogIn size={24} color="#fff" strokeWidth={2.5} />
          ) : (
            <LogOut size={24} color="#fff" strokeWidth={2.5} />
          )}
          <Text style={styles.label}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 72,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  label: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },
  disabled: {
    opacity: 0.55,
  },
});
