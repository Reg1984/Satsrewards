/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      colors: {
        'neu-base': '#F0F4F8',
        'neu-dark': '#D1D9E6',
        'neu-light': '#FFFFFF'
      },
      boxShadow: {
        'neu': '6px 6px 12px #D1D9E6, -6px -6px 12px #FFFFFF',
        'neu-sm': '4px 4px 8px #D1D9E6, -4px -4px 8px #FFFFFF',
        'neu-inner': 'inset 6px 6px 12px #D1D9E6, inset -6px -6px 12px #FFFFFF',
        'neu-inner-sm': 'inset 4px 4px 8px #D1D9E6, inset -4px -4px 8px #FFFFFF'
      },
      animation: {
        'gradient': 'gradient 8s linear infinite',
        'pulse-soft': 'pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'slide-up': 'slide-up 0.5s ease-out',
        'slide-down': 'slide-down 0.5s ease-out',
        'fade-in': 'fade-in 0.5s ease-out',
        'scale-in': 'scale-in 0.3s ease-out',
      },
      keyframes: {
        gradient: {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          },
        },
        'pulse-soft': {
          '0%, 100%': {
            opacity: 1,
            transform: 'scale(1)'
          },
          '50%': {
            opacity: 0.8,
            transform: 'scale(1.05)'
          },
        },
        'float': {
          '0%, 100%': {
            transform: 'translateY(0)'
          },
          '50%': {
            transform: 'translateY(-10px)'
          },
        },
        'slide-up': {
          '0%': {
            transform: 'translateY(20px)',
            opacity: 0
          },
          '100%': {
            transform: 'translateY(0)',
            opacity: 1
          },
        },
        'slide-down': {
          '0%': {
            transform: 'translateY(-20px)',
            opacity: 0
          },
          '100%': {
            transform: 'translateY(0)',
            opacity: 1
          },
        },
        'fade-in': {
          '0%': {
            opacity: 0
          },
          '100%': {
            opacity: 1
          },
        },
        'scale-in': {
          '0%': {
            transform: 'scale(0.95)',
            opacity: 0
          },
          '100%': {
            transform: 'scale(1)',
            opacity: 1
          },
        },
      },
    },
  },
  plugins: [],
}