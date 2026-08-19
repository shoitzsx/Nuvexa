/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#2563eb",
          600: "#1d4ed8",
          700: "#1e40af"
        },
        positive: {
          50: "#ecfdf5",
          100: "#d1fae5",
          500: "#059669",
          600: "#047857"
        },
        negative: {
          50: "#fef2f2",
          100: "#fee2e2",
          500: "#dc2626",
          600: "#b91c1c"
        }
      },
      boxShadow: {
        soft: "0 18px 50px -30px rgba(15, 23, 42, 0.35)"
      }
    },
  },
  plugins: [],
};
