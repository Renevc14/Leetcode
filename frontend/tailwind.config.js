/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        lc: {
          bg: '#1A1A1A',
          panel: '#282828',
          'panel-hover': '#333333',
          border: '#3C3C3C',
          text: '#EBEBEB',
          muted: '#8A8A8A',
          orange: '#FFA116',
          'orange-hover': '#FFB84D',
          green: '#00B8A3',
          red: '#EF4743',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        mono: ['Menlo', 'Consolas', 'Monaco', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
};
