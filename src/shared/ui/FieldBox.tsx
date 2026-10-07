import { Pressable, View } from 'react-native';

import { cn } from '@/shared/lib/cn';
import { Text } from './Text';

type Props = {
  label: string;
  value: string;
  mono?: boolean;
  onPress?: () => void;
  className?: string;
  testID?: string;
};

/** Filled 46px box with a small caption (start / end time, "Mỗi", "Đến ngày" in design 3b). */
export function FieldBox({ label, value, mono, onPress, className, testID }: Props) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${value}`}
      onPress={onPress}
      disabled={!onPress}
      className={cn('min-h-[46px] flex-1 justify-center rounded-field bg-field px-3 py-1 active:opacity-70', className)}
    >
      <Text className="text-meta text-muted">{label}</Text>
      <View>
        <Text mono={mono} weight="semibold" className={mono ? 'text-[16px] leading-[21px]' : 'text-body'}>
          {value}
        </Text>
      </View>
    </Pressable>
  );
}
