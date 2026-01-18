/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme colors from spec (#0b0b0b to #141414)
        dark: {
          bg: '#0b0b0b',
          surface: '#141414',
          elevated: '#1c1c1c',
          border: '#2a2a2a',
        },
        // Accent colors
        accent: {
          primary: '#6366f1',
          success: '#22c55e',
          warning: '#f59e0b',
          error: '#ef4444',
          muted: '#6b7280',
        }
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-top': 'env(safe-area-inset-top)',
      },
    },
  },
  plugins: [],
}
