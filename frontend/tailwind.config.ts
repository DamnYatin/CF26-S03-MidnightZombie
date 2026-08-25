import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        hud: {
          bg: '#051424',
          'bg-deep': '#020b14',
          surface: '#0f172a',
          card: '#131e30',
          'card-hover': '#1a2840',
          border: '#1e293b',
          'border-light': '#334155',
          'border-active': '#00d1c1',
          primary: '#00d1c1',
          'primary-dim': '#009d91',
          cyan: '#38bdf8',
          amber: '#f59e0b',
          red: '#ef4444',
          emerald: '#10b981',
          muted: '#64748b',
          text: '#94a3b8',
          bright: '#f1f5f9',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['Inter', 'Hanken Grotesk', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'hud-glow': '0 0 15px rgba(0, 209, 193, 0.25)',
        'hud-glow-red': '0 0 15px rgba(239, 68, 68, 0.35)',
        'hud-glow-amber': '0 0 15px rgba(245, 158, 11, 0.35)',
        'hud-card': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'pulse-fast': 'pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-glow': 'pulseGlow 2s infinite',
        'scanline': 'scanline 8s linear infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.08)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
