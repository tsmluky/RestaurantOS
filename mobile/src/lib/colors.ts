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
  background: "#F9FAFB",
  surface: "#FFFFFF",
  text: "#111827",
  textSecondary: "#6B7280",
  textTertiary: "#9CA3AF",
  border: "#E5E7EB",
  divider: "#F3F4F6",
} as const;

export type Color = (typeof colors)[keyof typeof colors];
