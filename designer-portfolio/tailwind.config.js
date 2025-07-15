
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./{components,pages,services,utils}/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Geologica', 'sans-serif'],
        body: ['Gabarito', 'sans-serif'],
      },
      colors: {
        base: '#F3F4F6',
        surface: '#FFFFFF',
        overlay: '#E5E7EB',
        primary: '#1F2937',
        secondary: '#6B7280',
        accent: '#4F46E5',
        gradientStart: '#F9FAFB',
        gradientEnd: '#E5E7EB',
      },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': theme('colors.secondary'),
            '--tw-prose-headings': theme('colors.primary'),
            '--tw-prose-lead': theme('colors.primary'),
            '--tw-prose-bold': theme('colors.primary'),
            '--tw-prose-counters': theme('colors.secondary'),
            '--tw-prose-bullets': theme('colors.secondary'),
          },
        },
      }),
      animation: {
        'gradient-x': 'gradient-x 3s ease infinite',
      },
      keyframes: {
        'gradient-x': {
          '0%, 100%': { 'background-size': '200% 200%', 'background-position': 'left center' },
          '50%': { 'background-size': '200% 200%', 'background-position': 'right center' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
