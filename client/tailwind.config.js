/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f1f5ff",
          100: "#e2ebff",
          500: "#4f6df5",
          600: "#3d55e0",
          700: "#3243b8",
        },
      },
    },
  },
  plugins: [],
};
