import React from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { AlertCircle, X } from "lucide-react-native";
import { colors } from "@/lib/colors";

type Props = {
  message: string | null;
  onDismiss?: () => void;
};

export function ErrorBanner({ message, onDismiss }: Props) {
  if (!message) return null;

  return (
    <View style={styles.container}>
      <AlertCircle size={18} stroke={colors.error} style={styles.icon} />
      <Text style={styles.text} numberOfLines={3}>
        {message}
      </Text>
      {onDismiss && (
        <Pressable onPress={onDismiss} hitSlop={12} style={styles.dismiss}>
          <X size={16} stroke={colors.error} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  icon: {
    marginRight: 10,
    flexShrink: 0,
  },
  text: {
    flex: 1,
    fontSize: 14,
    color: "#991B1B",
    lineHeight: 20,
  },
  dismiss: {
    marginLeft: 8,
    flexShrink: 0,
  },
});
