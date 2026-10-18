import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        prensa: [
          '"Libre Franklin Variable"',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
        maquina: ['"Courier Prime"', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        'fila-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'foja-in': {
          from: { opacity: '0', transform: 'translateY(18px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'lapiz-in': {
          from: { strokeDashoffset: '1' },
          to: { strokeDashoffset: '0' },
        },
        'sello-in': {
          '0%': { opacity: '0', scale: '1.45' },
          '60%': { opacity: '1', scale: '0.97' },
          '100%': { opacity: '1', scale: '1' },
        },
      },
      animation: {
        'fila-in': 'fila-in 520ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'foja-in': 'foja-in 760ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'lapiz-in': 'lapiz-in 420ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'sello-in': 'sello-in 380ms cubic-bezier(0.16, 1, 0.3, 1) both',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        danger: {
          DEFAULT: 'hsl(var(--danger) / <alpha-value>)',
          subtle: 'hsl(var(--danger-subtle) / <alpha-value>)',
          border: 'hsl(var(--danger-border) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'hsl(var(--success) / <alpha-value>)',
          subtle: 'hsl(var(--success-subtle) / <alpha-value>)',
          border: 'hsl(var(--success-border) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning) / <alpha-value>)',
          subtle: 'hsl(var(--warning-subtle) / <alpha-value>)',
          border: 'hsl(var(--warning-border) / <alpha-value>)',
        },
        info: {
          DEFAULT: 'hsl(var(--info) / <alpha-value>)',
          subtle: 'hsl(var(--info-subtle) / <alpha-value>)',
          border: 'hsl(var(--info-border) / <alpha-value>)',
        },
        review: {
          DEFAULT: 'hsl(var(--review) / <alpha-value>)',
          subtle: 'hsl(var(--review-subtle) / <alpha-value>)',
          border: 'hsl(var(--review-border) / <alpha-value>)',
        },
        caution: {
          DEFAULT: 'hsl(var(--caution) / <alpha-value>)',
          subtle: 'hsl(var(--caution-subtle) / <alpha-value>)',
          border: 'hsl(var(--caution-border) / <alpha-value>)',
        },
        inactivo: {
          DEFAULT: 'hsl(var(--inactivo) / <alpha-value>)',
          subtle: 'hsl(var(--inactivo-subtle) / <alpha-value>)',
          border: 'hsl(var(--inactivo-border) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
