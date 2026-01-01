/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        claude: {
          orange: '#D97706',
          dark: '#1a1a2e',
          darker: '#16162a',
          light: '#f5f5f5',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
