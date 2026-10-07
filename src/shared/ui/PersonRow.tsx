import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { cn } from '@/shared/lib/cn';

import { Avatar } from './Avatar';
import { Text } from './Text';

export type Person = {
  id: string;
  name: string;
  /** MSNV */
  code?: string | null;
  department?: string | null;
  avatarUrl?: string | null;
};

type Props = {
  person: Person;
  size?: number;
  trailing?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  className?: string;
  /** Emphasised name (15/600) for primary people on a card. */
  strong?: boolean;
  testID?: string;
};

/** Avatar + full name + "MSNV · phòng ban" — the person format used everywhere (CLAUDE.md §1.1). */
export function PersonRow({ person, size = 36, trailing, onPress, onLongPress, className, strong, testID }: Props) {
  const meta = [person.code, person.department].filter(Boolean).join(' · ');
  const content = (
    <>
      <Avatar name={person.name} uri={person.avatarUrl} size={size} />
      <View className="min-w-0 flex-1 gap-px">
        <Text weight={strong ? 'semibold' : 'medium'} numberOfLines={1} className={strong ? 'text-card' : 'text-body'}>
          {person.name}
        </Text>
        {meta ? (
          <Text numberOfLines={1} className="text-meta-sm text-muted">
            {meta}
          </Text>
        ) : null}
      </View>
      {trailing}
    </>
  );
  if (onPress || onLongPress) {
    return (
      <Pressable testID={testID} accessibilityRole="button" onPress={onPress} onLongPress={onLongPress} className={cn('flex-row items-center gap-3 active:opacity-70', className)}>
        {content}
      </Pressable>
    );
  }
  return (
    <View testID={testID} className={cn('flex-row items-center gap-3', className)}>
      {content}
    </View>
  );
}
