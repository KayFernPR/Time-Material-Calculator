/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#249100',    // Forest Green
        neutral: '#907c6d',    // Warm Gray
        light: '#EBE6E3'       // Cream
      },
    },
  },
  plugins: [],
}
