/** @type {import('tailwindcss').Config} */

/**
 * Los colores de la interfaz se resuelven con variables CSS. Así los mismos
 * componentes funcionan en ambos temas y el cambio es instantáneo, sin
 * duplicar clases `dark:` en toda la aplicación.
 */
const colorVariable = (nombre) => `rgb(var(${nombre}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // `white` representa la tinta principal (text-white) y `black` las sombras.
        white: colorVariable('--c-white'),
        black: colorVariable('--c-black'),
        slate: {
          50: colorVariable('--c-slate-50'),
          100: colorVariable('--c-slate-100'),
          200: colorVariable('--c-slate-200'),
          300: colorVariable('--c-slate-300'),
          400: colorVariable('--c-slate-400'),
          500: colorVariable('--c-slate-500'),
          600: colorVariable('--c-slate-600'),
          700: colorVariable('--c-slate-700'),
          800: colorVariable('--c-slate-800'),
          900: colorVariable('--c-slate-900'),
          950: colorVariable('--c-slate-950')
        },
        // Tonos de acento claros usados como texto/iconos: se oscurecen en
        // modo claro para conservar el contraste sobre fondos blancos.
        emerald: {
          200: colorVariable('--c-emerald-200'),
          300: colorVariable('--c-emerald-300'),
          400: colorVariable('--c-emerald-400')
        },
        amber: {
          200: colorVariable('--c-amber-200'),
          300: colorVariable('--c-amber-300'),
          400: colorVariable('--c-amber-400')
        },
        rose: {
          200: colorVariable('--c-rose-200'),
          300: colorVariable('--c-rose-300'),
          400: colorVariable('--c-rose-400')
        },
        sky: {
          300: colorVariable('--c-sky-300'),
          400: colorVariable('--c-sky-400')
        }
      },
      fontFamily: {
        sans: ['Segoe UI', 'system-ui', '-apple-system', 'sans-serif']
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.45)' },
          '70%': { boxShadow: '0 0 0 24px rgba(16, 185, 129, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(16, 185, 129, 0)' }
        }
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out',
        'scale-in': 'scale-in 160ms ease-out',
        'pulse-ring': 'pulse-ring 1.8s ease-out infinite'
      }
    }
  },
  plugins: []
};
