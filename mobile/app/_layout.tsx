import React, { useEffect, useRef } from "react";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useAuthStore } from "@/store/authStore";
import { colors } from "@/lib/colors";
import {
  getExpoPushToken,
  registerPushToken,
  unregisterPushToken,
  addNotificationResponseListener,
} from "@/lib/notifications";

export default function RootLayout() {
  const { initialize, isLoading, token, mode } = useAuthStore();
  const pushTokenRef = useRef<string | null>(null);

  useEffect(() => {
    void initialize();
  }, []);

  // Register push tokens only for employee sessions. Kiosk tablets should not
  // receive personal shift notifications.
  useEffect(() => {
    if (!token || mode !== "employee") return;

    let active = true;
    void (async () => {
      const pushToken = await getExpoPushToken();
      if (!pushToken || !active) return;
      pushTokenRef.current = pushToken;
      await registerPushToken(pushToken, token);
    })();

    return () => {
      active = false;
      const savedPushToken = pushTokenRef.current;
      if (savedPushToken) {
        void unregisterPushToken(savedPushToken, token);
        pushTokenRef.current = null;
      }
    };
  }, [token, mode]);

  // Navigate to the right screen when the user taps a notification
  useEffect(() => {
    const cleanup = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data as Record<string, string>;
      const type = data?.type;
      if (type === "schedule_published") {
        router.push("/(employee)/schedule");
      } else if (type === "checkout_reminder") {
        router.push("/(employee)");
      } else if (type === "correction_approved" || type === "correction_rejected") {
        router.push("/(employee)/history");
      }
    });
    return cleanup;
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!token) {
      router.replace("/login");
    } else if (mode === "kiosk") {
      router.replace("/kiosk");
    } else if (mode === "manager") {
      router.replace("/(manager)");
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
        <Stack.Screen name="(manager)" />
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
