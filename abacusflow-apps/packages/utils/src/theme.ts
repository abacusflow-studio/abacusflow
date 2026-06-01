export const COLORS = {
  primary: "#16a34a",
  primaryLight: "#dcfce7",
  success: "#16a34a",
  successLight: "#dcfce7",
  warning: "#d97706",
  warningLight: "#fff7ed",
  danger: "#e11d48",
  dangerLight: "#fff1f2",
  info: "#0891b2",
  infoLight: "#ecfeff",
  text: "#0f172a",
  textSecondary: "#475569",
  textTertiary: "#64748b",
  textDisabled: "#94a3b8",
  border: "#e2e8f0",
  borderInput: "#cbd5e1",
  bg: "#f8fafc",
  bgCard: "#ffffff",
  bgSidebar: "#f1f5f9",
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
  pending: { bg: "#fff7ed", color: "#d97706" },
  completed: { bg: "#dcfce7", color: "#16a34a" },
  canceled: { bg: "#fff1f2", color: "#e11d48" },
  reversed: { bg: "#f1f5f9", color: "#475569" },
};
