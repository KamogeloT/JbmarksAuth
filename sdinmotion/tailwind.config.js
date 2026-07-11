/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2E7D32', // JBmarks Medium Green
          light: '#66BB6A',   // JBmarks Light Green
          dark: '#1B5E20',    // JBmarks Dark Green
        },
        secondary: {
          DEFAULT: '#F5F7FA', // Light Background
          dark: '#E4E8EE',
        },
        accent: {
          DEFAULT: '#F9A825', // JBmarks Gold
          hover: '#FFD54F',
          dark: '#F57F17',
        },
        gold: {
          DEFAULT: '#F9A825',
          light: '#FFC107',
          dark: '#F57F17',
        },
        brand: {
          green: '#2E7D32',
          darkGreen: '#1B5E20',
          lightGreen: '#66BB6A',
          gold: '#F9A825',
          blue: '#1565C0',
        },
        success: {
          DEFAULT: '#388E3C',
          dark: '#2E7D32',
          light: '#C8E6C9',
        },
        danger: {
          DEFAULT: '#C62828',
          dark: '#B71C1C',
          light: '#FFCDD2',
        },
        light: {
          DEFAULT: '#FFFFFF',
          dark: '#F9FAFB',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-in': 'bounceIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        bounceIn: {
          from: { opacity: '0', transform: 'scale(0.9)' },
          '50%': { transform: 'scale(1.02)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
