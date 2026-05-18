import React, { useEffect } from "react";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useAuthStore } from "@/store/authStore";
import { colors } from "@/lib/colors";

export default function RootLayout() {
  const { initialize, isLoading, token, mode } = useAuthStore();

  useEffect(() => {
    void initialize();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!token) {
      router.replace("/login");
    } else if (mode === "kiosk") {
      router.replace("/kiosk");
    } else {
      router.replace("/(employee)");
    }
  }, [isLoading, token, mode]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(employee)" />
        <Stack.Screen name="kiosk" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});
