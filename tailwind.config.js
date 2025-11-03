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
          DEFAULT: '#2E7D32', // JBmarks Dark Green
          light: '#66BB6A',   // JBmarks Light Green
          dark: '#1B5E20',    // Darker Green
        },
        secondary: {
          DEFAULT: '#F5F7FA', // Light Background
          dark: '#E4E8EE',
        },
        accent: {
          DEFAULT: '#FFC107', // JBmarks Yellow/Gold
          hover: '#FFD54F',
        },
        success: {
          DEFAULT: '#388E3C', // Bright Green (more visible)
          dark: '#2E7D32',    // Deep Green
          light: '#C8E6C9',   // Light Green
        },
        danger: {
          DEFAULT: '#C62828', // Deep Red
          dark: '#B71C1C',    // Darker Red
          light: '#FFCDD2',
        },
        light: {
          DEFAULT: '#FFFFFF',
          dark: '#F9FAFB',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
