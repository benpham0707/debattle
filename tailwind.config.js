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
      },
    },
  },
  plugins: [],
} 