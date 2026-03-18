import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./context/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0e27",
        surface: "#131d3f",
        accent: "#00d9ff",
        success: "#10b981",
        warning: "#f59e0b",
        error: "#ef4444",
        "text-primary": "#f0f0f0",
        "text-secondary": "#a0a0a0",
        border: "#1a2542",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(rgba(0, 217, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 217, 255, 0.03) 1px, transparent 1px)",
        "glow-accent":
          "radial-gradient(circle at center, rgba(0, 217, 255, 0.15) 0%, transparent 70%)",
      },
      backgroundSize: {
        grid: "40px 40px",
      },
      boxShadow: {
        "glow-sm": "0 0 10px rgba(0, 217, 255, 0.2)",
        glow: "0 0 20px rgba(0, 217, 255, 0.3)",
        "glow-lg": "0 0 40px rgba(0, 217, 255, 0.4)",
        "inner-glow": "inset 0 0 20px rgba(0, 217, 255, 0.05)",
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 10px rgba(0, 217, 255, 0.2)" },
          "50%": { boxShadow: "0 0 30px rgba(0, 217, 255, 0.5)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      borderRadius: {
        DEFAULT: "0.375rem",
      },
    },
  },
  plugins: [],
};

export default config;
