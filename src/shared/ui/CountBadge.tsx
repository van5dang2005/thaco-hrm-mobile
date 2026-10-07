import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';

import type { ColorToken } from '@/core/theme/palette';
import { useTheme } from '@/core/theme/ThemeProvider';
import { cn } from '@/shared/lib/cn';

import { Text } from './Text';

type Props = {
  count: number;
  /** Disc height without a ring: `lg` = 20px, `md` = 18px (segmented), `sm` = 16px. */
  size?: 'lg' | 'md' | 'sm';
  tone?: 'danger' | 'primary';
  /** Positioning of the whole badge (ring included), e.g. `absolute -right-1 -top-1`. */
  className?: string;
  /**
   * Color of the 2px ring that separates the badge from what it overlaps (the surface behind it).
   * Ringed badges are always 20px: a 16px disc + 2px ring, as in the design.
   */
  ring?: ColorToken;
  max?: number;
  style?: StyleProp<ViewStyle>;
};

const discSize = { lg: 20, md: 18, sm: 16 };
const RING = 2;
const RINGED_DISC = 16;

/** Red (or primary) count. One digit is a circle; more digits grow into a pill. */
export function CountBadge({ count, size = 'lg', tone = 'danger', className, ring, max = 99, style }: Props) {
  const { colors } = useTheme();
  if (count <= 0) return null;
  const label = count > max ? `${max}+` : String(count);
  const d = ring ? RINGED_DISC : discSize[size];

  const disc = (
    <View
      className={cn('items-center justify-center rounded-full', tone === 'danger' ? 'bg-danger' : 'bg-primary')}
      style={{ height: d, minWidth: d, paddingHorizontal: label.length > 1 ? 4 : 0 }}
    >
      <Text
        weight="bold"
        numeric
        maxFontSizeMultiplier={1}
        className={tone === 'danger' ? 'text-white' : 'text-on-primary'}
        style={{ fontSize: 12, lineHeight: d, ...(Platform.OS === 'android' ? { includeFontPadding: false } : null) }}
      >
        {label}
      </Text>
    </View>
  );

  // The ring is a padded wrapper, not a border: a rounded border lets the disc color bleed at its
  // outer edge, which shows as a dark hairline around the badge.
  return (
    <View
      className={cn('rounded-full', className)}
      style={[ring ? { padding: RING, backgroundColor: colors[ring] } : null, style]}
    >
      {disc}
    </View>
  );
}
