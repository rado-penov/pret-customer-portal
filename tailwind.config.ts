import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        pret: {
          red:        "#711323",
          "red-deep": "#5a0e1b",
          "red-mid":  "#9F1B32",
          teal:       "#007281",
          "teal-light": "#98DBCE",
          gold:       "#CA9E03",
          green:      "#487302",
          "green-light": "#CBF174",
          text:       "#372F31",
          "text-muted": "#575354",
          bg:         "#FAF9FA",
          "bg-warm":  "#F6F4F5",
          "bg-card":  "#FFFFFF",
        },
      },
      borderRadius: {
        DEFAULT: "4px",
      },
    },
  },
  plugins: [],
};

export default config;
