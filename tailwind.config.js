const plugin = require('tailwindcss/plugin');
const palette = require('./src/core/theme/palette.json');

function hexToRgbTriplet(hex) {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

// Every palette key becomes a Tailwind color backed by a CSS variable, so the
// ThemeProvider can switch light/dark at runtime with NativeWind `vars()`.
const colors = Object.fromEntries(
  Object.keys(palette.light).map((key) => [key, `rgb(var(--c-${key}) / <alpha-value>)`]),
);

const rootVars = Object.fromEntries(
  Object.entries(palette.light).map(([key, hex]) => [`--c-${key}`, hexToRgbTriplet(hex)]),
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ...colors,
        transparent: 'transparent',
        white: '#FFFFFF',
        black: '#000000',
      },
      fontSize: {
        display: ['28px', { lineHeight: '34px', letterSpacing: '-0.6px' }],
        title: ['22px', { lineHeight: '28px', letterSpacing: '-0.4px' }],
        'title-lg': ['26px', { lineHeight: '32px', letterSpacing: '-0.6px' }],
        sheet: ['19px', { lineHeight: '25px', letterSpacing: '-0.3px' }],
        head: ['17px', { lineHeight: '22px', letterSpacing: '-0.2px' }],
        lead: ['18px', { lineHeight: '24px', letterSpacing: '-0.3px' }],
        card: ['15px', { lineHeight: '20px' }],
        body: ['14px', { lineHeight: '20px' }],
        'body-sm': ['13.5px', { lineHeight: '19px' }],
        sub: ['13px', { lineHeight: '18px' }],
        'sub-sm': ['12.5px', { lineHeight: '17px' }],
        meta: ['12px', { lineHeight: '16px' }],
        // Design uses 11.5 / 11 / 10.5px here; floored at 12px per the ≥12px legibility rule.
        'meta-sm': ['12px', { lineHeight: '16px' }],
        tag: ['12px', { lineHeight: '15px' }],
        tab: ['12px', { lineHeight: '15px' }],
      },
      borderRadius: {
        badge: '6px',
        chip: '999px',
        field: '12px',
        button: '14px',
        tile: '17px',
        card: '20px',
        'card-lg': '24px',
        sheet: '28px',
      },
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      addBase({ ':root': rootVars });
    }),
  ],
};
