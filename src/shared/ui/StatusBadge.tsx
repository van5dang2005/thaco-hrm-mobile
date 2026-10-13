import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { ColorToken } from '@/core/theme/palette';
import { useTheme } from '@/core/theme/ThemeProvider';
import { cn } from '@/shared/lib/cn';

import { Icon } from './Icon';
import type { AppIcon } from './icons';
import { bookingBadgeKind, parcelBadgeKind, type BadgeKind } from './status';
import { Text } from './Text';

export type { BadgeKind } from './status';

const kindColors: Record<BadgeKind, { bg: ColorToken | 'white'; fg: ColorToken | 'white' }> = {
  wait: { bg: 'primary-tint', fg: 'primary-tint-text' },
  warn: { bg: 'warning-tint', fg: 'warning-text' },
  danger: { bg: 'danger-tint', fg: 'danger-text' },
  ok: { bg: 'success-tint', fg: 'success-text' },
  off: { bg: 'off-tint', fg: 'off-text' },
  live: { bg: 'success', fg: 'white' },
};

/** Background / text color of a badge kind (also used for row tints and bars). */
export function useBadgeColors(kind: BadgeKind) {
  const { colors } = useTheme();
  const k = kindColors[kind];
  return { bg: k.bg === 'white' ? '#FFFFFF' : colors[k.bg], fg: k.fg === 'white' ? '#FFFFFF' : colors[k.fg] };
}

const dotColor: Record<BadgeKind, ColorToken | 'white'> = { wait: 'primary', warn: 'warning', danger: 'danger', ok: 'success', off: 'subtle', live: 'white' };

type Props = { kind: BadgeKind; label: string; icon?: AppIcon; /** 6px dot in the tone's solid color before the label. */ dot?: boolean; className?: string; testID?: string };

/** 24pt status pill, radius 12, 11/700 (README "Màu trạng thái"). The same five kinds serve parcels and bookings. */
export function StatusBadge({ kind, label, icon, dot, className, testID }: Props) {
  const { colors } = useTheme();
  const c = useBadgeColors(kind);
  const mark = dotColor[kind];
  return (
    <View testID={testID} className={cn('h-6 flex-shrink-0 flex-row items-center gap-1.5 self-start rounded-full px-[9px]', className)} style={{ backgroundColor: c.bg }}>
      {dot ? <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: mark === 'white' ? '#FFFFFF' : colors[mark] }} /> : null}
      {icon ? <Icon icon={icon} size={12} rawColor={c.fg} /> : null}
      <Text weight="bold" numberOfLines={1} maxFontSizeMultiplier={1.2} style={{ fontSize: 11, lineHeight: 14, color: c.fg }}>
        {label}
      </Text>
    </View>
  );
}

type StatusProps = { status: number; dot?: boolean; className?: string; testID?: string };

export function ParcelBadge({ status, short, dot, className, testID }: StatusProps & { short?: boolean }) {
  const { t } = useTranslation();
  const label = short ? t(`status.parcelShort.${String(status) as '1'}`, { defaultValue: String(status) }) : t(`status.parcel.${String(status) as '1'}`, { defaultValue: String(status) });
  return <StatusBadge kind={parcelBadgeKind(status)} label={label} dot={dot} className={className} testID={testID} />;
}

export function BookingBadge({ status, live, dot, className, testID }: StatusProps & { live?: boolean }) {
  const { t } = useTranslation();
  return (
    <StatusBadge
      kind={live ? 'live' : bookingBadgeKind(status)}
      label={live ? t('status.bookingPhase.live') : t(`status.booking.${String(status) as '1'}`, { defaultValue: String(status) })}
      dot={dot}
      className={className}
      testID={testID}
    />
  );
}

/** Small info tag (e.g. "8 người", "Cấp 2/2"): radius 7, 11/600, neutral or tinted. */
export function Tag({ label, icon, kind, className }: { label: string; icon?: AppIcon; kind?: BadgeKind | 'neutral'; className?: string }) {
  const { colors } = useTheme();
  const tinted = useBadgeColors(kind && kind !== 'neutral' ? kind : 'off');
  const bg = !kind || kind === 'neutral' ? colors['off-tint'] : tinted.bg;
  const fg = !kind || kind === 'neutral' ? colors['ink-2'] : tinted.fg;
  return (
    <View className={cn('h-6 flex-row items-center gap-1 self-start rounded-[7px] px-2', className)} style={{ backgroundColor: bg }}>
      {icon ? <Icon icon={icon} size={12} rawColor={fg} /> : null}
      <Text weight="semibold" numberOfLines={1} maxFontSizeMultiplier={1.15} style={{ fontSize: 11, lineHeight: 14, color: fg }}>
        {label}
      </Text>
    </View>
  );
}
