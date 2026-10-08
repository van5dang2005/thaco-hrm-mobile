import { Image } from 'expo-image';
import { useState } from 'react';
import { View } from 'react-native';

import { cn } from '@/shared/lib/cn';

import { Text } from './Text';

type Props = {
  name?: string | null;
  uri?: string | null;
  size?: number;
  className?: string;
  /** White ring used when avatars overlap in a stack. */
  ring?: boolean;
  /** White disc with primary initials, for avatars on the blue header. */
  light?: boolean;
};

const tones = [
  { box: 'bg-primary-tint-2', text: 'text-primary-tint-text' },
  { box: 'bg-success-tint', text: 'text-success' },
  { box: 'bg-warning-tint', text: 'text-warning' },
  { box: 'bg-line-2', text: 'text-ink-2' },
];

/** "Nguyễn Minh Khoa" -> "MK" (Vietnamese names: middle + given name). */
export function initialsOf(name?: string | null) {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[words.length - 2][0]}${words[words.length - 1][0]}`.toUpperCase();
}

function toneFor(name?: string | null) {
  const source = name ?? '';
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  return tones[hash % tones.length];
}

export function Avatar({ name, uri, size = 36, className, ring, light }: Props) {
  const [failed, setFailed] = useState(false);
  const tone = light ? { box: 'bg-white', text: 'text-primary' } : toneFor(name);
  const showImage = !!uri && !failed;
  const fontSize = Math.max(9, Math.round(size * 0.34));

  return (
    <View
      className={cn('items-center justify-center overflow-hidden rounded-full', !showImage && tone.box, ring && 'border-2 border-elevated', className)}
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {showImage ? (
        <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" onError={() => setFailed(true)} transition={120} />
      ) : (
        <Text weight="semibold" className={tone.text} style={{ fontSize, lineHeight: fontSize * 1.2 }}>
          {initialsOf(name)}
        </Text>
      )}
    </View>
  );
}

type StackProps = {
  people: { name?: string | null; uri?: string | null }[];
  size?: number;
  /** Bubbles shown, including the "+N" one. */
  max?: number;
};

/** Overlap of stacked avatars (v3: 6pt, a little more for large avatars). */
export const stackOverlap = (size: number) => (size > 32 ? 8 : 6);

/** Overlapping avatars (white 2pt ring) with a "+N" bubble. */
export function AvatarStack({ people, size = 30, max = 3 }: StackProps) {
  const shown = people.slice(0, people.length > max ? max - 1 : max);
  const rest = people.length - shown.length;
  const overlap = stackOverlap(size);
  return (
    <View className="flex-row">
      {shown.map((person, index) => (
        <View key={`${person.name}-${index}`} style={{ marginLeft: index === 0 ? 0 : -overlap }}>
          <Avatar name={person.name} uri={person.uri} size={size} ring={index > 0} />
        </View>
      ))}
      {rest > 0 ? (
        <View className="items-center justify-center rounded-full border-2 border-elevated bg-off-tint" style={{ width: size, height: size, marginLeft: -overlap }}>
          <Text weight="semibold" maxFontSizeMultiplier={1} className="text-ink-2" style={{ fontSize: Math.max(8, Math.round(size * 0.34)) }}>{`+${rest}`}</Text>
        </View>
      ) : null}
    </View>
  );
}
