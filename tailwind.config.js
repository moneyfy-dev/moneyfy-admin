/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        moneyfy: {
          50: '#ecfff0',
          100: '#d3ffdc',
          500: '#16e425',
          600: '#00c70f',
          700: '#01970e',
          900: '#064d0c',
        },
        ink: '#111111',
        paper: '#f3f6f4',
      },
      fontFamily: {
        sans: ['Poppins', 'ui-sans-serif', 'system-ui'],
      },
      boxShadow: {
        soft: '0 18px 60px rgba(17, 17, 17, 0.08)',
        green: '0 16px 36px rgba(0, 199, 15, 0.22)',
      },
    },
  },
  plugins: [],
}
