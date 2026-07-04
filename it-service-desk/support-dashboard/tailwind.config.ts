import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: { 50: '#E8F5E9', 100: '#C8E6C9', 200: '#A5D6A7', 300: '#81C784', 400: '#66BB6A', 500: '#4CAF50', 600: '#2E7D32', 700: '#1B5E20', 800: '#145218', 900: '#0D3B11' },
        gold: { 50: '#FFF9E6', 100: '#FFF3C4', 200: '#FFE082', 300: '#FFD54F', 400: '#FFC107', 500: '#F9A825', 600: '#F57F17' },
        brand: { dark: '#1B5E20', medium: '#2E7D32', light: '#66BB6A', accent: '#F9A825' },
        ios: { bg: '#f5f5f7', label: '#1d1d1f', secondary: '#86868b', tertiary: '#aeaeb2', separator: 'rgba(60,60,67,0.12)' },
      },
      boxShadow: { ios: '0 2px 12px rgba(0,0,0,0.08)', 'ios-lg': '0 8px 32px rgba(0,0,0,0.12)' },
    },
  },
  plugins: [],
}
export default config
