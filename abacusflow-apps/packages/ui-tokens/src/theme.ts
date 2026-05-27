export const COLORS = {
  primary: "#155EEF",
  primaryLight: "#EAF1FF",
  success: "#52c41a",
  successLight: "#ECFDF3",
  warning: "#fa8c16",
  warningLight: "#FFF7E8",
  danger: "#ff4d4f",
  dangerLight: "#FEF3F2",
  info: "#13c2c2",
  infoLight: "#e6fffb",
  text: "#1F2937",
  textSecondary: "#6B7280",
  textTertiary: "#9CA3AF",
  textDisabled: "#D1D5DB",
  border: "#E5E7EB",
  borderInput: "#D1D5DB",
  bg: "#F7F8FA",
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
