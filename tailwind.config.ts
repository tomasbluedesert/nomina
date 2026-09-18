import type { Config } from 'tailwindcss';
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: { ink: '#0F1D2E', ink2: '#2B3A4E', paper: '#F6F5F0', line: '#D9D6CC', cobalt: '#1F4FBF', dune: '#C8A566', sage: '#5E8B6A', ember: '#B5472E', amber: '#C98A1B' },
    fontFamily: { sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'], mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'] },
  } },
  plugins: [],
} satisfies Config;
