export const COLORS = {
  primary: "#1677ff",
  primaryLight: "#e6f4ff",
  success: "#52c41a",
  successLight: "#f6ffed",
  warning: "#fa8c16",
  warningLight: "#fff7e6",
  danger: "#ff4d4f",
  dangerLight: "#fff1f0",
  info: "#13c2c2",
  infoLight: "#e6fffb",
  text: "#333333",
  textSecondary: "#666666",
  textTertiary: "#999999",
  textDisabled: "#cccccc",
  border: "#f0f0f0",
  borderInput: "#d9d9d9",
  bg: "#f5f5f5",
  bgCard: "#ffffff",
  bgSidebar: "#ebedef",
  white: "#ffffff",
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const RADIUS = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
} as const;

export const SHADOW = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
} as const;

export const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending: { bg: "#fff7e6", color: "#fa8c16" },
  completed: { bg: "#f6ffed", color: "#52c41a" },
  canceled: { bg: "#fff1f0", color: "#ff4d4f" },
  reversed: { bg: "#f0f0f0", color: "#8c8c8c" },
};
