import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // OPENCLAW Platform 配色 (SPEC-00 §8.1)
        "bg-deep": "#080202",
        "bg-mid": "#1a0808",
        "bg-card": "rgba(20, 5, 5, 0.6)",
        "red-blood": "#8b0000",
        "red-bright": "#d10202",
        "red-flame": "#ff1f1f",
        gold: "#c9a961",
        "gold-bright": "#e8c878",
        "text-main": "#f0e6d6",
        "text-dim": "#a89c8b",
        "text-mute": "#6b5d50",
        "border-faint": "rgba(201, 169, 97, 0.2)",

        // dlc Academy 互換 (MVP2 までは使用)
        bg: "#080202",
        surface: "#1a0808",
        primary: "#c9a961",
        "primary-light": "#e8c878",
        "text-muted": "#a89c8b",
        border: "rgba(201, 169, 97, 0.2)",
      },
      fontFamily: {
        serif: ["var(--font-noto-serif)", "Noto Serif JP", "serif"],
        sans: ["var(--font-noto-sans)", "Noto Sans JP", "sans-serif"],
        cinzel: ["var(--font-cinzel)", "Cinzel", "serif"],
        bebas: ["var(--font-bebas)", "Bebas Neue", "sans-serif"],
      },
      backgroundImage: {
        "hero-radial":
          "radial-gradient(ellipse at center 30%, rgba(139, 0, 0, 0.3) 0%, transparent 60%)",
      },
    },
  },
  plugins: [],
};
export default config;
