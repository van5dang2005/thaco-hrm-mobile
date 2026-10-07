import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Linking, Pressable, View } from 'react-native';

import { apiFor } from '@/core/api/clients';
import { flattenPages, nextPageParam, type Paginated } from '@/core/api/types';
import { qk } from '@/core/query/keys';
import { useSessionStore } from '@/core/session/sessionStore';
import { parcelPerson, roomPerson, type ParcelUser, type RoomUser } from '@/core/session/userTypes';
import { useDebounced } from '@/shared/hooks/useDebounced';
import { Card } from '@/shared/ui/Card';
import { HeaderBar } from '@/shared/ui/HeaderBar';
import { Icon } from '@/shared/ui/Icon';
import { EnvelopeSimpleIcon, MagnifyingGlassIcon, PhoneIcon, UsersIcon } from '@/shared/ui/icons';
import { PersonRow } from '@/shared/ui/PersonRow';
import { ScreenShell, SHEET_PADDING } from '@/shared/ui/ScreenShell';
import { ListSkeleton } from '@/shared/ui/Skeleton';
import { EmptyState, ErrorState } from '@/shared/ui/StateViews';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';

const PAGE_SIZE = 30;

type Entry = ReturnType<typeof parcelPerson> & { phone?: string | null; email?: string | null };

function ContactButton({ icon, label, onPress }: { icon: typeof PhoneIcon; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      className="h-11 w-11 items-center justify-center rounded-full bg-icon-ring active:opacity-80"
    >
      <Icon icon={icon} size={18} color="primary-tint-text" />
    </Pressable>
  );
}

/** "Danh bạ": employee search over `GET /api/users` of whichever service is signed in (parcel first). */
export function DirectoryScreen() {
  const { t } = useTranslation();
  const connected = useSessionStore((s) => s.connected);
  const service = connected.parcel ? 'parcel' : 'room';
  const [search, setSearch] = useState('');
  const keyword = useDebounced(search.trim(), 350);

  const query = useInfiniteQuery({
    queryKey: [...qk.users.root(service), 'directory', keyword],
    queryFn: ({ pageParam }) =>
      apiFor(service).get<Paginated<ParcelUser | RoomUser>>('/api/users', { query: { searchKeyword: keyword, pageNumber: pageParam, pageSize: PAGE_SIZE } }),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
    enabled: (connected.parcel || connected.room) && keyword.length > 0,
  });
  const people: Entry[] = flattenPages(query.data?.pages).map((u) => ({
    ...(service === 'parcel' ? parcelPerson(u as ParcelUser) : roomPerson(u as RoomUser)),
    phone: u.phoneNumber,
    email: u.email,
  }));

  return (
    <ScreenShell header={<HeaderBar title={t('directory.title')} />} scroll={false}>
      <View className="px-4 pb-1 pt-[18px]">
        <TextField
          testID="directory-search"
          filled
          leftIcon={MagnifyingGlassIcon}
          value={search}
          onChangeText={setSearch}
          placeholder={t('directory.searchPlaceholder')}
          autoCorrect={false}
          autoFocus
          returnKeyType="search"
        />
      </View>

      {!keyword ? (
        <EmptyState icon={UsersIcon} message={t('directory.hint')} />
      ) : query.isLoading ? (
        <View className="p-4">
          <ListSkeleton count={4} lines={2} />
        </View>
      ) : query.isError && !people.length ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <FlatList
          data={people}
          keyExtractor={(p) => p.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: SHEET_PADDING.horizontal, paddingTop: 12, paddingBottom: SHEET_PADDING.bottom, gap: 10 }}
          renderItem={({ item, index }) => (
            <Card style={{ flexShrink: 0 }}>
            <PersonRow
              testID={`directory-person-${index}`}
              person={item}
              size={44}
              strong
              className="px-3.5 py-3"
              trailing={
                <View className="flex-row gap-2">
                  {item.phone ? <ContactButton icon={PhoneIcon} label={t('directory.call')} onPress={() => void Linking.openURL(`tel:${item.phone!.replace(/\s/g, '')}`)} /> : null}
                  {item.email ? <ContactButton icon={EnvelopeSimpleIcon} label={t('directory.email')} onPress={() => void Linking.openURL(`mailto:${item.email}`)} /> : null}
                </View>
              }
            />
            </Card>
          )}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
          }}
          ListEmptyComponent={<EmptyState icon={UsersIcon} message={t('directory.empty')} />}
          ListFooterComponent={query.isFetchingNextPage ? <Text className="py-4 text-center text-meta text-muted">{t('common.loadMore')}</Text> : null}
        />
      )}
    </ScreenShell>
  );
}
