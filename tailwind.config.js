/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Noto Serif SC', 'serif'],
        round: ['Varela Round', 'sans-serif'],
      },
    },
  },
  plugins: [],
}