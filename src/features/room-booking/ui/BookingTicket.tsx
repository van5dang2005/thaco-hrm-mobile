import { View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import { useTheme } from '@/core/theme/ThemeProvider';
import { Icon } from '@/shared/ui/Icon';
import { LockIcon } from '@/shared/ui/icons';
import { Text } from '@/shared/ui/Text';

type Props = {
  /** "Hằng tuần · 5 buổi" / "Một buổi". */
  badge: string;
  time: string;
  dates: string;
  title: string;
  confidential?: boolean;
  rows: { label: string; value: string }[];
};

const NOTCH = 24;

/** Ticket-style summary on the blue background (4d): time on top, details under a perforated cut. */
export function BookingTicket({ badge, time, dates, title, confidential, rows }: Props) {
  const { colors } = useTheme();
  return (
    <View testID="booking-ticket" className="mx-4 rounded-[24px] bg-surface">
      <View className="items-start gap-1.5 px-5 pb-[18px] pt-[22px]">
        <View className="h-6 justify-center rounded-full bg-primary-tint px-2.5">
          <Text weight="semibold" numberOfLines={1} className="text-meta-sm text-primary-tint-text">
            {badge}
          </Text>
        </View>
        <Text mono weight="semibold" numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.1} className="mt-1.5 text-ink" style={{ fontSize: 34, lineHeight: 38, letterSpacing: -1 }}>
          {time}
        </Text>
        <Text className="text-body text-ink-2">{dates}</Text>
      </View>

      {/* Perforation: dashed rule with two notches in the page color. */}
      <View style={{ height: NOTCH }} className="justify-center">
        <View className="mx-[18px]" style={{ height: 2 }}>
          <Svg width="100%" height={2}>
            <Line x1="0" y1="1" x2="100%" y2="1" stroke={colors.line} strokeWidth={2} strokeDasharray="6 5" />
          </Svg>
        </View>
        <View className="absolute rounded-full" style={{ left: -NOTCH / 2, width: NOTCH, height: NOTCH, backgroundColor: colors.header }} />
        <View className="absolute rounded-full" style={{ right: -NOTCH / 2, width: NOTCH, height: NOTCH, backgroundColor: colors.header }} />
      </View>

      <View className="gap-3 px-5 pb-5 pt-[18px]">
        <View className="flex-row items-start gap-2">
          <Text weight="bold" className="flex-1 text-card leading-[22px]" style={{ fontSize: 16 }}>
            {title}
          </Text>
          {confidential ? <Icon icon={LockIcon} size={16} color="muted" /> : null}
        </View>
        {rows.map((row) => (
          <View key={row.label} className="flex-row justify-between gap-3">
            <Text className="flex-none text-body-sm text-muted">{row.label}</Text>
            <Text weight="medium" numberOfLines={2} className="flex-shrink text-right text-body-sm">
              {row.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
