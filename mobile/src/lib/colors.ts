export const colors = {
  navy: "#0F172A",
  navySurface: "#1E293B",
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryLight: "#EFF6FF",
  success: "#16A34A",
  successLight: "#F0FDF4",
  error: "#DC2626",
  errorLight: "#FEF2F2",
  warning: "#D97706",
  warningLight: "#FFFBEB",
  background: "#F8FAFC",
  surface: "#FFFFFF",
  text: "#0F172A",
  textSecondary: "#64748B",
  textTertiary: "#94A3B8",
  border: "#E2E8F0",
  divider: "#F1F5F9",
} as const;

export type Color = (typeof colors)[keyof typeof colors];
