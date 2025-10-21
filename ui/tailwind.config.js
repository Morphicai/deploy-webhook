/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Legacy colors - keep for backward compatibility
        // Light theme colors - 从 theme.jpg 提取
        background: {
          DEFAULT: '#f7f8fc',
          light: '#ffffff',
          dark: '#1a1d2e',
        },
        surface: {
          DEFAULT: '#ffffff',
          light: '#fafbff',
          dark: '#242736',
          darker: '#1e2130',
        },
        sidebar: {
          light: '#ffffff',
          dark: '#1a1d2e',
        },
        border: {
          DEFAULT: 'rgba(0, 0, 0, 0.06)',
          light: 'rgba(0, 0, 0, 0.03)',
          dark: 'rgba(255, 255, 255, 0.08)',
        },
        text: {
          primary: {
            DEFAULT: '#1e2139',
            dark: '#ffffff',
          },
          secondary: {
            DEFAULT: '#6b7294',
            dark: '#a4a8c1',
          },
          muted: {
            DEFAULT: '#9fa4bf',
            dark: '#6b7294',
          },
        },
        // Brand colors - 从 theme.jpg 提取
        primary: {
          50: '#f0f4ff',
          100: '#e0e8ff',
          200: '#c7d6fe',
          300: '#a5bbfd',
          400: '#8199fa',
          500: '#5b7bf5',
          600: '#4761eb',
          700: '#3a4fd8',
          800: '#3142ae',
          900: '#2d3b89',
          DEFAULT: '#5b7bf5',
        },
        // Accent colors
        success: {
          DEFAULT: '#16c098',
          light: '#34d0b0',
          dark: '#12a37f',
        },
        warning: {
          DEFAULT: '#ffb800',
          light: '#ffc933',
          dark: '#d69a00',
        },
        error: {
          DEFAULT: '#ff5c5c',
          light: '#ff7878',
          dark: '#e54545',
        },
        info: {
          DEFAULT: '#00c2ff',
          light: '#33d1ff',
          dark: '#00a8e0',
        },
        // Chart colors - 从 theme.jpg 的图表中提取
        chart: {
          blue: '#5b7bf5',
          purple: '#a855f7',
          cyan: '#00d4ff',
          yellow: '#ffb800',
          green: '#16c098',
          pink: '#ff5c9d',
          orange: '#ff8c42',
        },
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.02)',
        DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.02)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -1px rgba(0, 0, 0, 0.02)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.06), 0 4px 6px -2px rgba(0, 0, 0, 0.03)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        card: '0 1px 3px rgba(0, 0, 0, 0.02), 0 4px 12px rgba(0, 0, 0, 0.03)',
        'card-hover': '0 4px 16px rgba(0, 0, 0, 0.06)',
        inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
