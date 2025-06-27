/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}",],
  theme: {
    extend: {
      colors: {
        primary: {
          100: "#FF5F00",
        },
        gris: {
          100: "#F7F7F7",
        },
      }
    },
  },
  plugins: [],
};
