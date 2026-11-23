/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gh: {
          bg: '#0d1117',
          header: '#010409',
          card: '#161b22',
          cardHover: '#1c2128',
          border: '#30363d',
          borderMuted: '#21262d',
          text: '#e6edf3',
          muted: '#7d8590',
          subtle: '#656c76',
          link: '#2f81f7',
          linkHover: '#58a6ff',
          green: '#238636',
          greenHover: '#2ea043',
          greenText: '#3fb950',
          greenBg: 'rgba(46, 160, 67, 0.15)',
          purple: '#8957e5',
          purpleText: '#a371f7',
          purpleBg: 'rgba(163, 113, 247, 0.15)',
          red: '#da3633',
          redText: '#f85149',
          redBg: 'rgba(248, 81, 73, 0.15)',
          yellow: '#d29922',
          yellowBg: 'rgba(187, 128, 9, 0.15)',
          btn: '#21262d',
          btnHover: '#30363d',
        }
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          '"Noto Sans"',
          'Helvetica',
          'Arial',
          'sans-serif',
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          '"SF Mono"',
          'Menlo',
          'Consolas',
          '"Liberation Mono"',
          'monospace',
        ],
      },
      borderRadius: {
        DEFAULT: '6px',
        md: '6px',
        lg: '6px',
        xl: '6px',
      }
    },
  },
  plugins: [],
}
