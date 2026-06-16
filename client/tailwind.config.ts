import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: "#14213d",
        gumleaf: "#2d6a4f",
        sunlit: "#fca311",
        paper: "#f8fafc"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(20, 33, 61, 0.10)"
      }
    }
  },
  plugins: []
} satisfies Config;
