import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

import palette from '@/core/theme/palette.json';

const fontSizes = [
  'display',
  'title',
  'title-lg',
  'sheet',
  'head',
  'lead',
  'card',
  'body',
  'body-sm',
  'sub',
  'sub-sm',
  'meta',
  'meta-sm',
  'tag',
  'tab',
];

const radii = ['badge', 'chip', 'field', 'button', 'tile', 'card', 'card-lg', 'sheet'];

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      colors: [...Object.keys(palette.light), 'white', 'black', 'transparent'],
      borderRadius: radii,
    },
    classGroups: {
      'font-size': [{ text: fontSizes }],
    },
  },
});

/** Joins class names and lets later utilities win over earlier conflicting ones. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
