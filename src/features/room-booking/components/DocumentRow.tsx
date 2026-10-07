import { Pressable, View } from 'react-native';

import { cn } from '@/shared/lib/cn';
import { Icon } from '@/shared/ui/Icon';
import { LinkSimpleIcon, XIcon } from '@/shared/ui/icons';
import { Text } from '@/shared/ui/Text';

function extensionOf(name: string) {
  const ext = name.split('.').pop()?.toUpperCase() ?? '';
  return ext.length <= 4 ? ext : 'FILE';
}

function formatSize(bytes?: number) {
  if (!bytes) return '';
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Document line: file type badge (or link icon), name, size, optional remove. */
export function DocumentRow({ name, size, link, onRemove }: { name: string; size?: number; link?: boolean; onRemove?: () => void }) {
  return (
    <View className="min-h-[40px] flex-row items-center gap-2.5">
      <View className={cn('h-8 w-8 items-center justify-center rounded-[8px]', link ? 'bg-primary-tint' : 'bg-danger-tint')}>
        {link ? (
          <Icon icon={LinkSimpleIcon} size={15} color="primary-tint-text" />
        ) : (
          <Text mono weight="semibold" className="text-meta text-danger">
            {extensionOf(name)}
          </Text>
        )}
      </View>
      <Text numberOfLines={1} className="flex-1 text-sub">
        {name}
      </Text>
      {size ? <Text className="text-meta text-subtle">{formatSize(size)}</Text> : null}
      {onRemove ? (
        <Pressable accessibilityRole="button" accessibilityLabel="remove" onPress={onRemove} hitSlop={10}>
          <Icon icon={XIcon} size={16} color="subtle" />
        </Pressable>
      ) : null}
    </View>
  );
}
