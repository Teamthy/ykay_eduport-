import * as LocalAuthentication from "expo-local-authentication";
import { Platform } from "react-native";

/**
 * Biometric helpers (Face ID / fingerprint / device PIN).
 * Requires: npx expo install expo-local-authentication
 * No-ops gracefully on web / when unavailable.
 */
export async function biometricAvailable(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const { available } = await LocalAuthentication.hasHardwareAsync();
    return available;
  } catch {
    return false;
  }
}

export async function biometricEnrolled(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const { enrolled } = await LocalAuthentication.isEnrolledAsync();
    return enrolled;
  } catch {
    return false;
  }
}

export async function authenticate(reason = "Unlock Ykay College"): Promise<boolean> {
  if (Platform.OS === "web") return true;
  try {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      fallbackLabel: "Use password",
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
    });
    return res.success;
  } catch {
    return false;
  }
}
