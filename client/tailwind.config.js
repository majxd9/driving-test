/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans Arabic"', 'Tahoma', 'sans-serif'],
      },
      colors: {
        paper: '#181A1F',
        surface: '#22252C',
        ink: '#F1EFE9',
        muted: '#9C9FA6',
        line: '#33363E',
        brand: {
          DEFAULT: '#22B588',
          deep: '#1B8F6C',
          soft: '#16332B',
        },
        signs: {
          DEFAULT: '#5B93E6',
          soft: '#1B2A42',
        },
        mek: {
          DEFAULT: '#E0912F',
          soft: '#33260F',
        },
        exam: {
          DEFAULT: '#E2564A',
          soft: '#3A2220',
        },
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
}
