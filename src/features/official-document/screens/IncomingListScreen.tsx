import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, View } from 'react-native';

import { diffDays, todayKey } from '@/core/time/vn';
import { usePullRefresh } from '@/shared/hooks/usePullRefresh';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { FilterChip } from '@/shared/ui/Chip';
import { HeaderIconButton } from '@/shared/ui/HeaderBar';
import { HeaderTabs } from '@/shared/ui/HeaderTabs';
import { CheckCheckIcon, InboxIcon, SearchIcon, SlidersHorizontalIcon, UserCheckIcon, XIcon } from '@/shared/ui/icons';
import { ModuleHeader } from '@/shared/ui/ModuleHeader';
import { CONTENT_PADDING, ModuleScreen } from '@/shared/ui/ModuleScreen';
import { ListSkeleton } from '@/shared/ui/Skeleton';
import { EmptyState, ErrorState } from '@/shared/ui/StateViews';
import { TextField } from '@/shared/ui/TextField';

import { IncomingDocCard } from '../components/IncomingDocCard';
import { useIncomingDocs } from '../hooks/useIncomingDocs';
import type { IncomingDoc } from '../types';
import { INCOMING_TABS, incomingCounts, inIncomingTab, isIncomingTab, needsDistribution, sortIncoming, type IncomingTab } from '../utils/incoming';
import { matchesQuery } from '../utils/text';

/** History older than this is left to the web app. */
const HISTORY_DAYS = 30;

type Filters = { urgent: boolean; unread: boolean };

function matchesSearch(doc: IncomingDoc, query: string) {
  return matchesQuery(query, doc.soDen, doc.soHieu, doc.trichYeu, doc.coQuan);
}

/** "Văn bản đến" (8c): documents to distribute, to process, and processed, newest received first. */
export function IncomingListScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ tab?: string; search?: string; unread?: string }>();
  const [tab, setTab] = useState<IncomingTab>(isIncomingTab(params.tab) ? params.tab : 'xu_ly');
  const [searching, setSearching] = useState(params.search === '1');
  const [query, setQuery] = useState('');
  // `unread=1`: opened from the home "Chưa đọc" counter.
  const [filters, setFilters] = useState<Filters>({ urgent: false, unread: params.unread === '1' });
  const [filterOpen, setFilterOpen] = useState(false);
  const docs = useIncomingDocs();
  const pull = usePullRefresh(() => docs.refetch());
  const today = todayKey();

  // Open work stays however old it is; only the processed history is cut to the last 30 days.
  const all = (docs.data ?? []).filter((d) => !inIncomingTab(d, 'da_xu_ly') || diffDays(d.ngayNhan, today) <= HISTORY_DAYS);
  const counts = incomingCounts(all);
  const items = sortIncoming(
    all.filter((d) => inIncomingTab(d, tab) && matchesSearch(d, query) && (!filters.urgent || d.khan) && (!filters.unread || !d.daXem)),
    tab,
    today,
  );
  const filtered = filters.urgent || filters.unread;

  const toggleSearch = () => {
    if (searching) setQuery('');
    setSearching((s) => !s);
  };

  const header = (
    <ModuleHeader
      testID="incoming-header"
      icon={InboxIcon}
      title={t('documents.incoming.title')}
      subtitle={t('documents.incoming.subtitle')}
      right={
        <>
          <HeaderIconButton testID="incoming-search" icon={searching ? XIcon : SearchIcon} label={searching ? t('documents.closeSearch') : t('documents.search')} onPress={toggleSearch} />
          <HeaderIconButton testID="incoming-filter" icon={SlidersHorizontalIcon} label={t('documents.filter')} onPress={() => setFilterOpen(true)} badge={filtered ? Number(filters.urgent) + Number(filters.unread) : undefined} />
        </>
      }
      bottom={0}
    >
      <HeaderTabs<IncomingTab>
        testID="incoming-tabs"
        options={INCOMING_TABS.map((key) => ({
          value: key,
          label: t(`documents.incoming.tab.${key}`),
          count: docs.data ? counts[key] : undefined,
          // Red count: documents wait for me to distribute.
          attention: key === 'phan_phoi',
          testID: `incoming-tab-${key}`,
        }))}
        value={tab}
        onChange={setTab}
      />
    </ModuleHeader>
  );

  return (
    <ModuleScreen header={header} scroll={false}>
      {docs.isLoading ? (
        <View className="p-4">
          <ListSkeleton count={3} lines={4} />
        </View>
      ) : docs.isError && !docs.data ? (
        <ErrorState error={docs.error} onRetry={() => void docs.refetch()} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(doc) => doc.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: CONTENT_PADDING.horizontal, paddingTop: CONTENT_PADDING.top, paddingBottom: CONTENT_PADDING.bottom, gap: CONTENT_PADDING.gap }}
          ListHeaderComponent={
            searching ? (
              <TextField testID="incoming-search-field" leftIcon={SearchIcon} value={query} onChangeText={setQuery} placeholder={t('documents.incoming.searchPlaceholder')} autoFocus autoCorrect={false} returnKeyType="search" />
            ) : null
          }
          renderItem={({ item }) => (
            <IncomingDocCard
              doc={item}
              today={today}
              onPress={() => router.push({ pathname: '/documents/incoming/[id]', params: { id: item.id } })}
              onDistribute={needsDistribution(item) ? () => router.push({ pathname: '/documents/incoming/[id]/assign', params: { id: item.id } }) : undefined}
            />
          )}
          refreshControl={<RefreshControl refreshing={pull.refreshing} onRefresh={() => void pull.onRefresh()} />}
          ListEmptyComponent={
            <EmptyState
              testID="incoming-empty"
              icon={tab === 'da_xu_ly' ? CheckCheckIcon : tab === 'xu_ly' ? UserCheckIcon : InboxIcon}
              message={query.trim() || filtered ? t('documents.noResults') : t(`documents.incoming.empty.${tab}`)}
            />
          }
        />
      )}

      <BottomSheet
        testID="incoming-filter-sheet"
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        icon={SlidersHorizontalIcon}
        iconTone="brand"
        title={t('documents.filter')}
        footer={
          <View className="flex-row gap-2.5">
            <Button testID="incoming-filter-reset" className="flex-1" variant="soft" label={t('documents.filterReset')} onPress={() => setFilters({ urgent: false, unread: false })} />
            <Button testID="incoming-filter-apply" className="flex-[1.4]" label={t('documents.filterApply')} onPress={() => setFilterOpen(false)} />
          </View>
        }
      >
        <View className="flex-row flex-wrap gap-2">
          <FilterChip testID="incoming-filter-urgent" label={t('documents.urgent')} selected={filters.urgent} onPress={() => setFilters((f) => ({ ...f, urgent: !f.urgent }))} />
          <FilterChip testID="incoming-filter-unread" label={t('documents.unread')} selected={filters.unread} onPress={() => setFilters((f) => ({ ...f, unread: !f.unread }))} />
        </View>
      </BottomSheet>
    </ModuleScreen>
  );
}
