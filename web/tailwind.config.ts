import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        navy: "#0F172A",
        bg: "#F7F8FA",
        surface: "#FFFFFF",
        border: "#E4E7EC",
        muted: "#667085",
        primary: {
          DEFAULT: "#1D4ED8",
          soft: "#EFF6FF",
          fg: "#FFFFFF"
        },
        success: {
          DEFAULT: "#0F9F6E",
          soft: "#E7F8F1"
        },
        warning: {
          DEFAULT: "#D97706",
          soft: "#FFF7E6"
        },
        danger: {
          DEFAULT: "#DC2626",
          soft: "#FEF2F2"
        }
      },
      boxShadow: {
        panel: "0 1px 2px rgba(16, 24, 40, 0.06), 0 8px 24px rgba(16, 24, 40, 0.06)"
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "Segoe UI", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
