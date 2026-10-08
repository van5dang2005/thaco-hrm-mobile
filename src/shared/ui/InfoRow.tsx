import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { cn } from '@/shared/lib/cn';

import { Icon } from './Icon';
import { type AppIcon, ChevronRightIcon } from './icons';
import { RoundIcon, type RoundIconTone } from './RoundIcon';
import { Text } from './Text';

type Props = {
  label: string;
  value?: ReactNode;
  mono?: boolean;
  /** 32pt round icon before the label. */
  icon?: AppIcon;
  iconTone?: RoundIconTone;
  onPress?: () => void;
  /** Hairline above the row (rows inside one card). */
  divider?: boolean;
  /** Extra content under the row (e.g. the document list). */
  children?: ReactNode;
  testID?: string;
};

/** Icon + label ……… value row inside a card (6b, 3h): padding 12/14, chevron when pressable. */
export function InfoRow({ label, value, mono, icon, iconTone = 'wait', onPress, divider, children, testID }: Props) {
  const content = (
    <>
      {icon ? <RoundIcon icon={icon} size={32} tone={iconTone} /> : null}
      <Text numberOfLines={1} className="flex-shrink-0 text-ink-2" style={{ fontSize: 14, lineHeight: 19 }}>
        {label}
      </Text>
      <View className="min-w-0 flex-1 flex-row items-center justify-end gap-1.5">
        {typeof value === 'string' || typeof value === 'number' ? (
          <Text mono={mono} weight="medium" numberOfLines={2} className="flex-shrink text-right" style={{ fontSize: 13.5, lineHeight: 18 }}>
            {value}
          </Text>
        ) : (
          value
        )}
        {onPress ? <Icon icon={ChevronRightIcon} size={15} color="subtle" /> : null}
      </View>
    </>
  );
  const rowClass = 'min-h-[48px] flex-row items-center gap-3 px-3.5 py-3';
  return (
    <View className={cn(divider && 'border-t border-line-2')}>
      {onPress ? (
        <Pressable testID={testID} accessibilityRole="button" onPress={onPress} className={cn(rowClass, 'active:bg-line-2')}>
          {content}
        </Pressable>
      ) : (
        <View testID={testID} className={rowClass}>
          {content}
        </View>
      )}
      {children}
    </View>
  );
}
