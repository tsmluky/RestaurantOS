/**
 * Expo Push Notifications helper.
 *
 * Call `registerForPushNotifications(token, apiToken)` right after a successful
 * login to obtain an ExpoPushToken and register it with the backend.
 *
 * Call `unregisterPushToken(pushToken, apiToken)` on logout.
 */
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { apiRequest } from "@/lib/api";

// How notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type PushPermissionStatus = "granted" | "denied" | "undetermined";

/**
 * Request notification permissions and obtain the Expo push token.
 * Returns null if the user denies permission or on simulator (no token available).
 */
export async function getExpoPushToken(): Promise<string | null> {
  // Ask for permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("[Notifications] Permission not granted");
    return null;
  }

  // Android requires a notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "RestaurantOS",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2563EB",
    });
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      // For production EAS builds, set projectId from app.json extra.eas.projectId
      // For Expo Go development, this works without projectId
    });
    return tokenData.data;
  } catch (err) {
    console.log("[Notifications] Could not get push token:", err);
    return null;
  }
}

/**
 * Register the device's push token with the backend.
 * Call this after every login (idempotent — backend upserts).
 */
export async function registerPushToken(
  pushToken: string,
  apiToken: string
): Promise<void> {
  try {
    await apiRequest("/notifications/register-token", apiToken, {
      method: "POST",
      body: JSON.stringify({
        token: pushToken,
        platform: Platform.OS === "ios" ? "ios" : "android",
      }),
    });
    console.log("[Notifications] Token registered with backend");
  } catch (err) {
    // Non-critical: log and continue. App works fine without push.
    console.warn("[Notifications] Failed to register token:", err);
  }
}

/**
 * Unregister the push token on logout so this device stops receiving notifications.
 */
export async function unregisterPushToken(
  pushToken: string,
  apiToken: string
): Promise<void> {
  try {
    await apiRequest("/notifications/unregister-token", apiToken, {
      method: "DELETE",
      body: JSON.stringify({ token: pushToken }),
    });
  } catch (err) {
    console.warn("[Notifications] Failed to unregister token:", err);
  }
}

/**
 * Add a listener that fires when the user taps a notification.
 * Returns a cleanup function — call it in useEffect cleanup.
 */
export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener(handler);
  return () => sub.remove();
}
