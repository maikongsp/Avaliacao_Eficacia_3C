import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fef2f4',
          100: '#fde0e5',
          200: '#fbb8c4',
          300: '#f78098',
          400: '#f04060',
          500: '#de0209',
          600: '#c41230',
          700: '#9b0e24',
          800: '#75152e',
          900: '#4e0e1e',
          coffee: '#98531a',
          dark:   '#3e3938',
        },
      },
    },
  },
  plugins: [],
};

export default config;
