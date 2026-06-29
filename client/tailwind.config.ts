import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: "#102033",
        gumleaf: "#1f6f55",
        sunlit: "#d97706",
        paper: "#f4f7f5",
        mist: "#e8f0ec",
        harbor: "#29506f",
        clay: "#b95c3f"
      },
      boxShadow: {
        soft: "0 20px 55px rgba(16, 32, 51, 0.10)",
        panel: "0 16px 44px rgba(16, 32, 51, 0.08)",
        lift: "0 12px 28px rgba(31, 111, 85, 0.20)"
      },
      keyframes: {
        "ready-pulse": {
          "0%, 100%": {
            boxShadow: "0 0 0 0 rgba(31, 111, 85, 0.32), 0 12px 28px rgba(31, 111, 85, 0.18)"
          },
          "50%": {
            boxShadow: "0 0 0 8px rgba(31, 111, 85, 0), 0 18px 34px rgba(31, 111, 85, 0.24)"
          }
        },
        "route-nudge": {
          "0%, 100%": { transform: "translateX(0)" },
          "45%": { transform: "translateX(2px)" },
          "55%": { transform: "translateX(-1px)" }
        }
      },
      animation: {
        "ready-pulse": "ready-pulse 1.8s ease-in-out infinite",
        "route-nudge": "route-nudge 1.8s ease-in-out infinite"
      }
    }
  },
  plugins: []
} satisfies Config;
