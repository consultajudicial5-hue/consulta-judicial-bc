/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1a56db',
        secondary: '#0e9f6e',
        danger: '#e02424',
        warning: '#ff5a1f',
      },
    },
  },
  plugins: [],
};
