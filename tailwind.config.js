/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        nexus: {
          yellow: "#facc15",
          amber: "#f59e0b",
          purple: "#8b5cf6",
          cyan: "#22d3ee",
          pink: "#f472b6",
          mint: "#34d399",
          red: "#f87171",
          bg: "#08080c",
          bg2: "#0b0b0f",
          ink: "#0a0a0d",
        },
      },
      backgroundImage: {
        "gradient-aurora":
          "linear-gradient(135deg, #facc15 0%, #f472b6 35%, #8b5cf6 70%, #22d3ee 100%)",
        "gradient-sunset":
          "linear-gradient(135deg, #f97316 0%, #facc15 45%, #f472b6 100%)",
        "gradient-ocean":
          "linear-gradient(135deg, #22d3ee 0%, #8b5cf6 50%, #f472b6 100%)",
        "gradient-forest":
          "linear-gradient(135deg, #34d399 0%, #22d3ee 60%, #8b5cf6 100%)",
        "gradient-ember":
          "linear-gradient(135deg, #ef4444 0%, #f97316 60%, #facc15 100%)",
        "gradient-soft":
          "linear-gradient(135deg, rgba(250, 204, 21, 0.18), rgba(139, 92, 246, 0.18), rgba(34, 211, 238, 0.18))",
      },
      boxShadow: {
        glow: {
          yellow: "0 0 60px rgba(250, 204, 21, 0.30)",
          purple: "0 0 60px rgba(139, 92, 246, 0.30)",
          cyan: "0 0 60px rgba(34, 211, 238, 0.30)",
          pink: "0 0 60px rgba(244, 114, 182, 0.30)",
        },
        glass:
          "0 10px 40px rgba(0, 0, 0, 0.36), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
        "glass-lift":
          "0 22px 60px rgba(0, 0, 0, 0.50), inset 0 1px 0 rgba(255, 255, 255, 0.10)",
      },
      animation: {
        "aurora-drift": "nexus-aurora-drift 24s linear infinite",
        "aurora-pulse": "nexus-aurora-pulse 14s ease-in-out infinite",
        "grad-pan": "nexus-grad-pan 8s ease-in-out infinite",
        "grad-pan-x": "nexus-grad-pan-x 6s ease-in-out infinite",
        "pulse-slow": "nexus-pulse 10s ease-in-out infinite",
        "dot-pulse": "nexus-dot-pulse 2s ease-in-out infinite",
      },
      keyframes: {
        "nexus-aurora-drift": {
          "0%": "{ transform: translate3d(0,0,0) rotate(0deg); }",
          "50%": "{ transform: translate3d(-3vmax,2vmax,0) rotate(180deg); }",
          "100%": "{ transform: translate3d(0,0,0) rotate(360deg); }",
        },
        "nexus-aurora-pulse": {
          "0%, 100%": "{ transform: scale(1); opacity: 0.45; }",
          "50%": "{ transform: scale(1.12); opacity: 0.65; }",
        },
        "nexus-grad-pan": {
          "0%, 100%": "{ background-position: 0% 50%; }",
          "50%": "{ background-position: 100% 50%; }",
        },
        "nexus-grad-pan-x": {
          "0%, 100%": "{ background-position: 0% 50%; }",
          "50%": "{ background-position: 100% 50%; }",
        },
        "nexus-pulse": {
          "0%, 100%": "{ transform: scale(1); opacity: 0.85; }",
          "50%": "{ transform: scale(1.10); opacity: 1; }",
        },
        "nexus-dot-pulse": {
          "0%, 100%": "{ transform: scale(1); opacity: 0.9; }",
          "50%": "{ transform: scale(1.35); opacity: 1; }",
        },
      },
    },
  },
  plugins: [],
};
