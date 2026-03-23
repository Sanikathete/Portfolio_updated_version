/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        app: '#0a0f1e',
        'app-card': '#0d1426',
        'app-border': '#1e2d4a',
        'app-text': '#e2e8f0',
        'app-secondary': '#94a3b8',
        'app-muted': '#64748b',
        'app-accent': '#22d3a5',
        'app-gain': '#22d3a5',
        'app-loss': '#f87171',
      },
      boxShadow: {
        panel: '0 24px 60px rgba(2, 8, 23, 0.45)',
        glow: '0 0 0 1px rgba(34, 211, 165, 0.12), 0 16px 36px rgba(34, 211, 165, 0.12)',
      },
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
