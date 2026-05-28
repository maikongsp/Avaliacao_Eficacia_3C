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
          // Vermelho oficial 3corações (Manual de Identidade Visual — RGB 170 39 47)
          50:  '#FDF5F5',
          100: '#FAE0E1',
          200: '#F3B5B8',
          300: '#E8878C',
          400: '#D65460',
          500: '#BF3640',
          600: '#AA272F',   // primário oficial
          700: '#8A1E25',
          800: '#68151A',
          900: '#3F0C0F',
          // Cores complementares do manual
          yellow:  '#FDC82F',   // amarelo oficial — RGB 253 200 47
          green:   '#427730',   // verde oficial — RGB 66 119 48
          coffee:  '#98531a',   // marrom café
          cream:   '#FDF6EE',   // creme quente
          dark:    '#2C1A1A',   // quase preto com tom quente
          muted:   '#7A4A4E',   // texto secundário
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        sans:    ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 12px 0 rgba(170,39,47,0.08)',
        'card-hover': '0 8px 24px 0 rgba(170,39,47,0.15)',
        sidebar: '4px 0 24px 0 rgba(42,10,12,0.18)',
      },
    },
  },
  plugins: [],
};

export default config;
