/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        wise: {
          lime: "#9FE870",
          "lime-hover": "#8EE05B",
          forest: "#163300",
          "forest-hover": "#1E4202",
          surface: "#F2F4F0",
          "surface-card": "#ECEFEA",
          border: "#E2E5DE",
          "border-dark": "rgba(22, 51, 0, 0.12)",
          text: "#111111",
          muted: "#5F625E",
        },
        brand: {
          50: "#f0fdf4",
          100: "#dcfce7",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          900: "#14532d",
        },
      },
      borderRadius: {
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
