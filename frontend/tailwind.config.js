/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        panel: 'var(--color-panel)',
        panelLight: 'var(--color-panel-light)',
        panelHeader: 'var(--color-panel-header)',
        accent: 'var(--color-accent)',
        accentDark: 'var(--color-accent-dark)',
        bubbleOut: 'var(--color-bubble-out)',
        bubbleIn: 'var(--color-bubble-in)',
        bgChat: 'var(--color-bg-chat)',
        textMuted: 'var(--color-text-muted)',
        textPrimary: 'var(--color-text-primary)',
        badgeVerified: '#2563EB',
        badgeDev: '#7C3AED',
        badgeAdmin: '#F59E0B',
        statusOnline: '#00a884',
        statusAway: '#F0B429',
        statusBusy: '#E5484D',
        statusOffline: '#8696a0',
      },
      fontFamily: {
        sans: ['Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
