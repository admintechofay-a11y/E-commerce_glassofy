/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        page: '#FAF8F4',
        surface: '#F0EDE8',
        taupe: '#F0EDE8',
        hairline: '#DDD8CF',
        muted: '#7A726A',
        primary: {
          DEFAULT: '#3A2F2B',
          hover: '#2E2622',
          text: '#FAF8F4',
        },
        ink: {
          DEFAULT: '#2E2622',
          darker: '#1A1412',
          light: '#3A2F2B',
          muted: '#7A726A',
          card: '#F0EDE8',
        },
        charcoal: {
          DEFAULT: '#3A2F2B',
          border: '#DDD8CF',
          light: '#F0EDE8',
          hover: '#E7E2DA',
        },
        ivory: {
          DEFAULT: '#FAF8F4',
          muted: '#7A726A',
          dark: '#2E2622',
        },
        brass: {
          DEFAULT: '#B08D57',
          hover: '#9C7A48',
          light: '#CDB185',
          dark: '#8E6E3B',
          glow: 'rgba(176, 141, 87, 0.12)',
          subtle: '#F5EFE6',
        },
        slate: {
          50: '#FAF8F4',
          100: '#F0EDE8',
          200: '#E5E1D8',
          300: '#DDD8CF',
          400: '#9E978F',
          500: '#7A726A',
          600: '#5A534C',
          700: '#3A2F2B',
          800: '#2E2622',
          900: '#1A1412',
        },
        // Functional states - strict editorial earthy tones, NO purple/violet
        emerald: {
          500: '#4F6B4A',
          600: '#3D5439',
          subtle: '#EDF2EC',
        },
        rose: {
          500: '#A4493D',
          600: '#8A3B31',
          subtle: '#F9ECEB',
        },
        amber: {
          500: '#B08D57',
          600: '#947545',
          subtle: '#F7F3EC',
        },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      letterSpacing: {
        editorial: '0.08em',
        wide: '0.05em',
        tightSerif: '-0.02em',
      },
      borderRadius: {
        editorial: '2px',
      },
      boxShadow: {
        flat: 'none',
        'brass-subtle': '0 1px 3px 0 rgba(46, 38, 34, 0.05)',
        'brass-glow': '0 2px 6px 0 rgba(46, 38, 34, 0.08)',
        'card-dark': '0 2px 8px 0 rgba(46, 38, 34, 0.06)',
      },
      transitionDuration: {
        editorial: '200ms',
      },
    },
  },
  plugins: [],
};
