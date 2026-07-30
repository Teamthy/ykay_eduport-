import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { api } from "@/lib/api";

/**
 * Request notification permission, obtain the Expo push token, and register it
 * with the backend so the school can send alerts (results, fees, attendance).
 * No-ops on web / if permission is denied.
 * Requires: npx expo install expo-notifications
 */
export async function registerForPushNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== "granted") return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    const token = tokenData?.data;
    if (!token) return;

    await api("/api/push/register", {
      method: "POST",
      body: JSON.stringify({ token, platform: Platform.OS }),
    });
  } catch {
    /* non-fatal — push is a bonus, not a blocker */
  }
}

/** Configure how notifications appear while the app is open (foreground). */
export function configureNotifications(): void {
  if (Platform.OS === "web") return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch {
    /* ignore */
  }
}
