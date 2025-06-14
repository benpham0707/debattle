/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'debate-blue': '#3B82F6',
        'debate-red': '#EF4444',
        'debate-green': '#10B981',
        'comic-yellow': '#FFD600',
        'comic-blue': '#1E90FF',
        'comic-pink': '#FF69B4',
        'comic-red': '#FF1744',
        'comic-purple': '#8e24aa',
        'comic-green': '#00E676',
        'comic-dark': '#22223b',
      },
    },
  },
  plugins: [],
} 