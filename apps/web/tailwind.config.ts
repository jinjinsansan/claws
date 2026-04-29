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
        bg: "#0a0a0f",
        surface: "#12121e",
        primary: "#c9a84c",
        "primary-light": "#e8c96a",
        "text-main": "#f0f0f0",
        "text-muted": "#8888aa",
        border: "#2a2a3e",
      },
      fontFamily: {
        serif: ["var(--font-noto-serif)", "Noto Serif JP", "serif"],
        sans: ["var(--font-noto-sans)", "Noto Sans JP", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
