/**
 * Theme constants for native components.
 * Aligned with the shared @abacusflow/ui-tokens COLORS palette.
 */

import { Platform } from "react-native";
import { COLORS } from "@abacusflow/ui-tokens";

export const Colors = {
  light: {
    text: COLORS.text,
    background: COLORS.bgCard,
    tint: COLORS.primary,
    icon: COLORS.textTertiary,
    tabIconDefault: COLORS.textTertiary,
    tabIconSelected: COLORS.primary,
  },
  dark: {
    text: "#ECEDEE",
    background: "#151718",
    tint: "#fff",
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: "#fff",
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
