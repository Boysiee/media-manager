/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          50: '#080808',
          100: '#0a0a0a',
          200: '#111111',
          300: '#1a1a1a',
          400: '#222222',
          500: '#2a2a2a',
          600: '#333333',
          700: '#444444',
          800: '#666666',
          900: '#999999'
        },
        accent: {
          DEFAULT: '#6366f1',
          light: '#818cf8',
          dark: '#4f46e5',
          muted: 'rgba(99, 102, 241, 0.12)'
        }
      },
      fontSize: {
        '2xs': '0.6875rem'
      },
      animation: {
        'fade-in': 'fadeIn 150ms ease-out',
        'slide-in-right': 'slideInRight 200ms ease-out',
        'slide-in-up': 'slideInUp 150ms ease-out',
        'scale-in': 'scaleIn 150ms ease-out'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideInRight: {
          '0%': { transform: 'translateX(16px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        },
        slideInUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        }
      }
    }
  },
  plugins: []
}
