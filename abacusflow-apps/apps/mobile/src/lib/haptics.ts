import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

export type HapticKind = "light" | "medium" | "selection" | "success" | "error";

export async function triggerHaptic(kind: HapticKind = "light") {
  if (Platform.OS === "web") return;

  try {
    if (kind === "selection") {
      await Haptics.selectionAsync();
      return;
    }
    if (kind === "success") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }
    if (kind === "error") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    await Haptics.impactAsync(
      kind === "medium"
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light,
    );
  } catch {
    // Haptics may be unavailable in simulators or unsupported devices.
  }
}
