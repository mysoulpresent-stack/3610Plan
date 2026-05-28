/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
      },
      colors: {
        'brand-beige': '#FDFCF8',
        'brand-green': '#E8F5E9',
        'brand-green-dark': '#4CAF50',
        'brand-green-deep': '#1B5E20',
        'brand-green-light': '#C8E6C9',
        'brand-yellow': '#FFF9C4',
        'brand-yellow-dark': '#FBC02D',
      },
    },
  },
  plugins: [],
}
