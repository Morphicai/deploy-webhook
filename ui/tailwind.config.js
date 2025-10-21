/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#f5f6fb',
          subtle: '#f8f9ff',
          dark: '#0f1120',
          deep: '#090a12',
        },
        surface: {
          DEFAULT: '#ffffff',
          subtle: '#f2f4ff',
          muted: '#eceff9',
          dark: '#1a1c2d',
          darker: '#141624',
        },
        border: {
          DEFAULT: '#e0e4f5',
          strong: '#c9cfee',
          dark: '#2a2d3e',
          accent: '#4f42ff',
        },
        text: {
          primary: '#1a1f2f',
          secondary: '#5f667c',
          muted: '#8f96ad',
          dark: '#f7f8ff',
          softer: '#b8bfd8',
        },
        brand: {
          100: '#efe8ff',
          200: '#d9c6ff',
          300: '#c3a4ff',
          400: '#ac82ff',
          500: '#9660ff',
          600: '#854df7',
          700: '#6f3adb',
          800: '#5026a4',
          900: '#34186d',
          DEFAULT: '#9660ff',
          foreground: '#ffffff',
        },
        success: {
          DEFAULT: '#2dd4bf',
          dark: '#0f766e',
        },
        neutral: {
          50: '#f7f8ff',
          100: '#eff1fb',
          200: '#dfe3f5',
          300: '#cfd5e4',
          400: '#b7bdce',
          500: '#9aa1b8',
        },
      },
      boxShadow: {
        soft: '0 24px 48px -32px rgba(24, 32, 72, 0.35)',
        brand: '0 18px 36px -20px rgba(118, 74, 255, 0.55)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      transitionTimingFunction: {
        'in-out-soft': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
}
