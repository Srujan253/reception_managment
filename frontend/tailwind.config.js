/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#F9FAFB',
        'bg-secondary': '#F3F4F6',
        'border-soft': '#CBD5E1',
        'text-primary': '#111827',
        'text-secondary': '#6B7280',
        'text-muted': '#9CA3AF',
        'accent-slate': '#64748B',
        'accent-blue': '#3B82F6',
        'accent-sage': '#6B8F71',
        'success': '#16A34A',
        'warning': '#D97706',
        'error': '#DC2626',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'hard': '4px 4px 0px 0px rgba(0,0,0,0.08)',
        'hard-sm': '2px 2px 0px 0px rgba(0,0,0,0.06)',
        'hard-lg': '6px 6px 0px 0px rgba(0,0,0,0.08)',
        'hard-hover': '6px 6px 0px 0px rgba(0,0,0,0.10)',
      },
      borderWidth: {
        DEFAULT: '1px',
      },
    },
  },
  plugins: [],
}
