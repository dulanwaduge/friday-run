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
      }
    }
  },
  plugins: []
} satisfies Config;
