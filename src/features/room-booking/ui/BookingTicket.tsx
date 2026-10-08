import { View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import { useTheme } from '@/core/theme/ThemeProvider';
import { Card } from '@/shared/ui/Card';
import { Icon } from '@/shared/ui/Icon';
import { LockIcon } from '@/shared/ui/icons';
import { Tag } from '@/shared/ui/StatusBadge';
import { Text } from '@/shared/ui/Text';

type Props = {
  /** "Hằng tuần · 5 buổi" / "Một buổi". */
  badge: string;
  /** "T2 05/10 → 02/11". */
  dates: string;
  time: string;
  title: string;
  confidential?: boolean;
  rows: { label: string; value: string }[];
};

const NOTCH = 16;

/** Ticket-style summary (4d): series chip and dates, title, the time in large mono, then details under a perforated cut. */
export function BookingTicket({ badge, dates, time, title, confidential, rows }: Props) {
  const { colors } = useTheme();
  return (
    <Card testID="booking-ticket" className="overflow-visible">
      <View className="gap-2 px-4 pb-4 pt-4">
        <View className="flex-row items-center justify-between gap-2">
          <Tag kind="wait" label={badge} />
          <Text mono numberOfLines={1} className="flex-shrink text-muted" style={{ fontSize: 11.5, lineHeight: 15 }}>
            {dates}
          </Text>
        </View>
        <View className="flex-row items-start gap-2 pt-1">
          <Text weight="bold" numberOfLines={3} className="flex-1 text-ink" style={{ fontSize: 16.5, lineHeight: 22 }}>
            {title}
          </Text>
          {confidential ? <Icon icon={LockIcon} size={16} color="muted" /> : null}
        </View>
        <Text mono weight="bold" numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.1} className="text-primary" style={{ fontSize: 26, lineHeight: 32, letterSpacing: -0.5 }}>
          {time}
        </Text>
      </View>

      {/* Perforation: dashed rule with two notches in the page color. */}
      <View style={{ height: NOTCH }} className="justify-center">
        <View className="mx-4" style={{ height: 1 }}>
          <Svg width="100%" height={1}>
            <Line x1="0" y1="0.5" x2="100%" y2="0.5" stroke={colors.line} strokeWidth={1} strokeDasharray="5 4" />
          </Svg>
        </View>
        <View className="absolute rounded-full" style={{ left: -NOTCH / 2, width: NOTCH, height: NOTCH, backgroundColor: colors.canvas }} />
        <View className="absolute rounded-full" style={{ right: -NOTCH / 2, width: NOTCH, height: NOTCH, backgroundColor: colors.canvas }} />
      </View>

      <View className="px-4 pb-1 pt-1">
        {rows.map((row, i) => (
          <View key={row.label} className={`min-h-[40px] flex-row items-center justify-between gap-3 ${i > 0 ? 'border-t border-line-2' : ''}`}>
            <Text className="flex-none text-muted" style={{ fontSize: 13, lineHeight: 17 }}>
              {row.label}
            </Text>
            <Text weight="bold" numberOfLines={2} className="flex-shrink text-right text-ink" style={{ fontSize: 13, lineHeight: 17 }}>
              {row.value}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}
