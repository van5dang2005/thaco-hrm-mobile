import { Switch, View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { cn } from '@/shared/lib/cn';

import { Icon } from './Icon';
import type { AppIcon } from './icons';
import { Text } from './Text';

type Props = {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  icon?: AppIcon;
  hint?: string;
  className?: string;
  testID?: string;
};

/** Label + platform switch (e.g. "Nội dung mật", "Gửi email thông báo"). */
export function SwitchRow({ label, value, onChange, icon, hint, className, testID }: Props) {
  const { colors } = useTheme();
  return (
    <View className={cn('min-h-[44px] flex-row items-center gap-2', className)}>
      {icon ? <Icon icon={icon} size={15} color="muted" /> : null}
      <View className="flex-1 gap-0.5">
        <Text className="text-body text-ink-2">{label}</Text>
        {hint ? <Text className="text-meta text-muted">{hint}</Text> : null}
      </View>
      <Switch
        testID={testID}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.success, false: colors.track }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={colors.track}
        accessibilityLabel={label}
      />
    </View>
  );
}
