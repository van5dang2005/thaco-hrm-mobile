import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, SectionList, View } from 'react-native';

import { todayKey } from '@/core/time/vn';
import { usePullRefresh } from '@/shared/hooks/usePullRefresh';
import { HeaderSegmented } from '@/shared/ui/HeaderSegmented';
import { FileTextIcon, Share2Icon } from '@/shared/ui/icons';
import { ModuleHeader } from '@/shared/ui/ModuleHeader';
import { CONTENT_PADDING, ModuleScreen } from '@/shared/ui/ModuleScreen';
import { GroupTitle } from '@/shared/ui/SectionTitle';
import { ListSkeleton } from '@/shared/ui/Skeleton';
import { EmptyState, ErrorState } from '@/shared/ui/StateViews';

import { HeaderChips } from '../components/HeaderChips';
import { SharedDocRow } from '../components/SharedDocRow';
import { useSharedDocs } from '../hooks/useSharedDocs';
import type { SharedKind } from '../types';
import { groupShared, isSharedFilter, isSharedKind, isUnread, matchesSharedFilter, SHARED_FILTERS, sharedFilterCounts, type SharedFilter } from '../utils/shared';

/** "Văn bản được chia sẻ" (8g): outgoing / internal, filtered, grouped by day. */
export function SharedListScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ kind?: string; filter?: string }>();
  const query = useSharedDocs();
  const docs = query.data ?? [];
  // Open on the kind that holds unread documents when none is asked for.
  const [kind, setKind] = useState<SharedKind>(isSharedKind(params.kind) ? params.kind : docs.some((d) => d.kind === 'di' && isUnread(d)) && !docs.some((d) => d.kind === 'noi_bo' && isUnread(d)) ? 'di' : 'noi_bo');
  const [filter, setFilter] = useState<SharedFilter>(isSharedFilter(params.filter) ? params.filter : 'tat_ca');
  const pull = usePullRefresh(() => query.refetch());

  const ofKind = docs.filter((d) => d.kind === kind);
  const counts = sharedFilterCounts(ofKind);
  const groups = groupShared(ofKind.filter((d) => matchesSharedFilter(d, filter)), todayKey());

  const header = (
    <ModuleHeader testID="shared-header" icon={Share2Icon} title={t('documents.shared.title')} subtitle={t('documents.shared.subtitle')} bottom={18}>
      <HeaderSegmented<SharedKind>
        testID="shared-kind"
        className=""
        options={(['di', 'noi_bo'] as const).map((key) => ({
          value: key,
          label: t(`documents.shared.kind.${key}`),
          badge: query.data ? docs.filter((d) => d.kind === key).length : undefined,
          badgeTone: 'neutral' as const,
          testID: `shared-kind-${key}`,
        }))}
        value={kind}
        onChange={setKind}
      />
      <View className="mt-3">
        <HeaderChips<SharedFilter>
          testID="shared-filters"
          options={SHARED_FILTERS.map((key) => ({ value: key, label: t(`documents.shared.filter.${key}`), count: query.data ? counts[key] : undefined, testID: `shared-filter-${key}` }))}
          value={filter}
          onChange={setFilter}
        />
      </View>
    </ModuleHeader>
  );

  return (
    <ModuleScreen header={header} scroll={false}>
      {query.isLoading ? (
        <View className="p-4">
          <ListSkeleton count={3} lines={3} />
        </View>
      ) : query.isError && !query.data ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <SectionList
          sections={groups.map((g) => ({ key: g.key, title: t(`documents.shared.group.${g.key}`), data: g.docs }))}
          keyExtractor={(doc) => doc.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingHorizontal: CONTENT_PADDING.horizontal, paddingTop: CONTENT_PADDING.top, paddingBottom: CONTENT_PADDING.bottom }}
          renderSectionHeader={({ section }) => <GroupTitle className="mb-2 mt-1">{section.title}</GroupTitle>}
          renderItem={({ item }) => <SharedDocRow doc={item} onPress={() => router.push({ pathname: '/documents/shared/[id]', params: { id: item.id } })} />}
          ItemSeparatorComponent={() => <View style={{ height: CONTENT_PADDING.gap }} />}
          SectionSeparatorComponent={() => <View style={{ height: 6 }} />}
          refreshControl={<RefreshControl refreshing={pull.refreshing} onRefresh={() => void pull.onRefresh()} />}
          ListEmptyComponent={<EmptyState testID="shared-empty" icon={FileTextIcon} message={filter === 'tat_ca' ? t('documents.shared.empty') : t('documents.noResults')} />}
        />
      )}
    </ModuleScreen>
  );
}
