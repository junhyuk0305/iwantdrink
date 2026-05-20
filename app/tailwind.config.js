/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        handwriting: ['"Nanum Pen Script"', 'cursive'],
        sans: ['"Noto Sans KR"', 'sans-serif'],
      },
      colors: {
        pojangAmber: '#f59e0b',
        pojangRust: '#7c2d12',
        sojuGreen: '#3a6b4d',
      },
      animation: {
        'pulse-warn': 'pulseWarn 1.5s ease-in-out infinite',
        'rain-flicker': 'rainFlicker 0.18s steps(2) infinite',
      },
      keyframes: {
        pulseWarn: {
          '0%, 100%': { boxShadow: '0 0 0 rgba(239,68,68,0)' },
          '50%': { boxShadow: '0 0 24px rgba(239,68,68,0.55)' },
        },
        rainFlicker: {
          '0%': { opacity: '0.92' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
