/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Aptos', 'Segoe UI', 'sans-serif'],
        display: ['Bahnschrift', 'Aptos', 'sans-serif'],
      },
      colors: {
        ink: '#17211f',
        moss: '#315c4f',
        leaf: '#4f8f72',
        paper: '#f7f4ea',
        line: '#d9d4c4',
        danger: '#b42318',
      },
    },
  },
  plugins: [],
};
