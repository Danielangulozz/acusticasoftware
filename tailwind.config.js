/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        apple: {
          bg: '#f5f5f7',
          card: '#ffffff',
          darkCard: '#1c1c1e',
          text: '#1d1d1f',
          subtext: '#86868b',
          blue: '#0071e3',
          blueHover: '#0077ed',
          green: '#34c759',
          orange: '#ff9500',
          red: '#ff3b30',
          purple: '#af52de',
          border: 'rgba(0, 0, 0, 0.08)',
          borderSubtle: 'rgba(0, 0, 0, 0.04)',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', '"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'SF Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'apple-sm': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'apple': '0 4px 20px rgba(0, 0, 0, 0.06)',
        'apple-lg': '0 12px 36px rgba(0, 0, 0, 0.09)',
        'apple-glass': '0 8px 32px 0 rgba(0, 0, 0, 0.06)',
        'apple-hover': '0 14px 28px rgba(0, 0, 0, 0.09), 0 10px 10px rgba(0, 0, 0, 0.04)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideRight: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        slideRight: 'slideRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [],
}
