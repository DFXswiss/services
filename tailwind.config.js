/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'media',
  theme: {
    colors: {
      white: '#ffffff',
      black: '#000000',
      primary: {
        red: '#F5516C',
        blue: '#072440',
      },
      link: '#f7f7f7',
      dfxBlue: {
        300: '#5A81BB',
        400: '#124370',
        500: '#0A355C',
        600: '#092E51',
        700: '#082948',
        800: '#072440',
      },
      dfxRed: {
        100: '#F5516C',
        150: '#E73955',
      },
      dfxGray: {
        400: '#EAECF0',
        500: '#D6DBE2',
        600: '#B8C4D8',
        700: '#9AA5B8',
        800: '#65728A',
      },
      dfxRedBlue: {
        200: '#DE4D68',
        300: '#C54863',
        400: '#AE445F',
        500: '#963F5A',
        600: '#6B3753',
        700: '#55334E',
        800: '#49314C',
        900: '#402F4B',
        1000: '#2D2B47',
      },
    },
    fontSize: {
      '2xs': '0.625rem', // 10px
      xs: '0.75rem', // 12px
      sm: '0.875rem', // 14px
      base: '1rem', // 16px
      lg: '1.25rem', // 20px
      xl: '1.5rem', // 24px
      '2xl': '1.75rem', // 28px
      '3xl': '2rem', // 32px
      '4xl': '2.25rem', // 36px
      '5xl': '2.5rem', // 40px
    },
    borderRadius: {
      none: '0',
      sm: '0.25rem', // 4px
      DEFAULT: '0.625rem', // 10px
      md: '0.75rem', // 12px
      lg: '0.9375rem', // 15px
      full: '9999px',
    },
    extend: {},
  },
};
