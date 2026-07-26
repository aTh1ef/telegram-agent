import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#ffffff",
        "canvas-subtle": "#f6f8fa",
        "canvas-inset": "#f6f8fa",
        border: {
          DEFAULT: "#d0d7de",
          muted: "#d8dee4",
        },
        fg: {
          DEFAULT: "#1f2328",
          muted: "#59636e",
          subtle: "#6e7781",
        },
        accent: {
          DEFAULT: "#0969da",
          emphasis: "#0550ae",
          subtle: "#ddf4ff",
        },
        success: {
          DEFAULT: "#1a7f37",
          subtle: "#dafbe1",
        },
        danger: {
          DEFAULT: "#cf222e",
          subtle: "#ffebe9",
        },
        attention: {
          DEFAULT: "#9a6700",
          subtle: "#fff8c5",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "SF Mono",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        card: "0 1px 0 rgba(31,35,40,0.04)",
        overlay: "0 8px 24px rgba(140,149,159,0.2)",
      },
      borderRadius: {
        md: "6px",
      },
    },
  },
  plugins: [],
};

export default config;
