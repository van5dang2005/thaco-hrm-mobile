import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { formatKey, todayKey, weekdayOf } from '@/core/time/vn';
import { usePullRefresh } from '@/shared/hooks/usePullRefresh';
import { PressableCard } from '@/shared/ui/Card';
import { HeaderIconButton } from '@/shared/ui/HeaderBar';
import { Icon } from '@/shared/ui/Icon';
import { type AppIcon, ChevronRightIcon, ClipboardListIcon, ClockAlertIcon, MailIcon, ScrollTextIcon, SearchIcon, StampIcon, UserCheckIcon } from '@/shared/ui/icons';
import { ModuleHeader } from '@/shared/ui/ModuleHeader';
import { ModuleScreen } from '@/shared/ui/ModuleScreen';
import { useHeaderColors } from '@/shared/ui/ScreenShell';
import { SectionTitle } from '@/shared/ui/SectionTitle';
import { CardSkeleton } from '@/shared/ui/Skeleton';
import { EmptyState, ErrorState } from '@/shared/ui/StateViews';
import { Text } from '@/shared/ui/Text';
import { type Tone, useToneColors } from '@/shared/ui/tones';

import { TaskCard } from '../components/TaskCard';
import { useDocumentMe } from '../hooks/useDocumentMe';
import { useDocumentSummary } from '../hooks/useDocumentSummary';
import { useIncomingDocs } from '../hooks/useIncomingDocs';
import { byUrgency, tasksOf, tasksOnDay } from '../utils/tasks';

const TODAY_TASKS = 3;

/** Văn thư home (8a): how much waits for me, four counters that open the matching list, today's tasks. */
export function DocumentsHomeScreen() {
  const { t } = useTranslation();
  const { fg, text2, text3 } = useHeaderColors();
  const me = useDocumentMe();
  const { summary, isLoading, isError, error, refetch } = useDocumentSummary();
  const incoming = useIncomingDocs();
  const pull = usePullRefresh(refetch);
  const today = todayKey();
  const openToday = tasksOnDay(tasksOf(incoming.data ?? []), today, today)
    .filter((task) => !task.cancelled && !task.done)
    .sort(byUrgency);
  const todayTasks = openToday.slice(0, TODAY_TASKS);
  const moreToday = openToday.length - todayTasks.length;

  const header = (
    <ModuleHeader
      testID="documents-header"
      icon={ScrollTextIcon}
      title={t('documents.title')}
      subtitle={me.data?.unit ?? t('documents.home.subtitleFallback')}
      right={<HeaderIconButton testID="documents-search" icon={SearchIcon} label={t('documents.search')} onPress={() => router.push({ pathname: '/documents/incoming', params: { search: '1' } })} />}
      bottom={12}
    >
      {/* Equal blue above the date and under the count (to the cards' top edge): the block sits mid-header. */}
      <Text weight="bold" className="mt-3.5" style={{ fontSize: 11, lineHeight: 14, letterSpacing: 0.66, color: text3 }}>
        {t('documents.home.date', { weekday: t(`time.weekday.${String(weekdayOf(today)) as '0'}`), date: formatKey(today) }).toLocaleUpperCase()}
      </Text>
      <View className="mt-1.5 flex-row items-center gap-3" accessible accessibilityLabel={t('documents.home.pendingA11y', { count: summary?.pending ?? 0 })}>
        {/* Proportional digits: mono ones sit centered in a wide cell, so "1" or "7" would start right of the date. */}
        <Text weight="bold" maxFontSizeMultiplier={1.1} style={{ marginLeft: -1, fontSize: 52, lineHeight: 58, letterSpacing: -1, color: fg }}>
          {summary ? String(summary.pending) : '–'}
        </Text>
        <View className="flex-1">
          <Text weight="bold" style={{ fontSize: 17, lineHeight: 22, color: fg }}>
            {t('documents.home.heroUnit')}
          </Text>
          <Text weight="medium" style={{ fontSize: 13, lineHeight: 18, color: text2 }}>
            {t('documents.home.heroWaiting')}
          </Text>
        </View>
      </View>
    </ModuleHeader>
  );

  const goIncoming = (tab: 'phan_phoi' | 'xu_ly') => router.push({ pathname: '/documents/incoming', params: { tab } });

  return (
    <ModuleScreen header={header} overlap refreshControl={<RefreshControl refreshing={pull.refreshing} onRefresh={() => void pull.onRefresh()} />}>
      {isError && !summary ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <>
          <View className="mt-2 gap-2.5" testID="documents-stats">
            <View className="flex-row gap-2.5">
              <StatTile
                testID="documents-stat-handle"
                icon={ClipboardListIcon}
                tone="wait"
                label={t('documents.home.toHandle')}
                value={summary?.toHandle}
                hint={summary ? (summary.toHandle ? t('documents.home.toHandleHint', { distribute: summary.toDistribute, process: summary.toProcess }) : t('documents.home.toHandleNone')) : undefined}
                onPress={() => goIncoming(summary && !summary.toDistribute && summary.toProcess ? 'xu_ly' : 'phan_phoi')}
              />
              <StatTile
                testID="documents-stat-unread"
                icon={MailIcon}
                tone="warn"
                label={t('documents.home.unread')}
                value={summary?.unread}
                hint={summary ? (summary.unread ? t('documents.home.unreadHint') : t('documents.home.unreadNone')) : undefined}
                onPress={() => router.push({ pathname: '/documents/incoming', params: { tab: 'phan_phoi', unread: summary?.unread ? '1' : undefined } })}
              />
            </View>
            <View className="flex-row gap-2.5">
              <StatTile
                testID="documents-stat-stamp"
                icon={StampIcon}
                tone="document"
                label={t('documents.home.toStamp')}
                value={summary?.toStamp}
                hint={summary ? (summary.toStamp ? t('documents.home.toStampHint', { di: summary.toStampDi, noiBo: summary.toStampNoiBo }) : t('documents.home.toStampNone')) : undefined}
                onPress={() => router.push('/documents/stamp')}
              />
              <StatTile
                testID="documents-stat-overdue"
                icon={ClockAlertIcon}
                tone="danger"
                label={t('documents.home.overdue')}
                value={summary?.overdue}
                hint={summary ? (summary.overdue ? t('documents.home.overdueHint', { count: summary.worstOverdueDays }) : t('documents.home.overdueNone')) : undefined}
                hintDanger={!!summary?.overdue}
                onPress={() => router.push({ pathname: '/documents/tasks', params: { tab: 'qua_han' } })}
              />
            </View>
          </View>

          <SectionTitle
            className="mt-2"
            right={
              <Pressable testID="documents-calendar-link" accessibilityRole="link" hitSlop={10} onPress={() => router.push('/documents/tasks')} className="flex-row items-center gap-0.5 active:opacity-70">
                <Text weight="semibold" className="text-primary" style={{ fontSize: 13, lineHeight: 17 }}>
                  {t('documents.home.calendar')}
                </Text>
                <Icon icon={ChevronRightIcon} size={15} color="primary" weight="bold" />
              </Pressable>
            }
          >
            {openToday.length ? t('documents.home.todayCount', { count: openToday.length }) : t('documents.home.today')}
          </SectionTitle>
          {isLoading ? (
            <CardSkeleton lines={3} />
          ) : todayTasks.length ? (
            <>
              {todayTasks.map((task) => (
                <TaskCard key={task.id} task={task} today={today} compact onPress={() => router.push({ pathname: '/documents/incoming/[id]', params: { id: task.docId } })} />
              ))}
              {moreToday > 0 ? (
                <Pressable testID="documents-today-more" accessibilityRole="link" onPress={() => router.push('/documents/tasks')} className="flex-row items-center justify-center gap-1 py-1 active:opacity-70">
                  <Text weight="semibold" className="text-primary" style={{ fontSize: 13, lineHeight: 17 }}>
                    {t('documents.home.todayMore', { count: moreToday })}
                  </Text>
                  <Icon icon={ChevronRightIcon} size={15} color="primary" weight="bold" />
                </Pressable>
              ) : null}
            </>
          ) : (
            <EmptyState testID="documents-today-empty" icon={UserCheckIcon} message={t('documents.home.todayEmpty')} />
          )}

        </>
      )}
    </ModuleScreen>
  );
}

type StatTileProps = {
  icon: AppIcon;
  /** Each counter keeps its own color: to handle blue, unread amber, to stamp violet (the Văn thư color), overdue red. */
  tone: Exclude<Tone, 'off'> | 'document';
  label: string;
  value?: number;
  hint?: string;
  hintDanger?: boolean;
  onPress: () => void;
  testID?: string;
};

/**
 * One of the four counters: a tinted disc in the top-right corner (echoing the header circles) holding the icon,
 * the label, the count in the tone's color with a › disc saying it opens a list, and a one-line breakdown.
 */
function StatTile({ icon, tone, label, value, hint, hintDanger, onPress, testID }: StatTileProps) {
  const { colors } = useTheme();
  const toneColor = useToneColors(tone === 'document' ? 'wait' : tone);
  const color = tone === 'document' ? { tint: colors['document-tint'], solid: colors.document } : toneColor;
  return (
    <PressableCard testID={testID} accessibilityLabel={`${label}: ${value ?? ''}. ${hint ?? ''}`} onPress={onPress} className="min-h-[118px] flex-1 justify-between gap-2 p-3.5">
      <View pointerEvents="none" style={{ position: 'absolute', width: 92, height: 92, borderRadius: 46, right: -26, top: -26, backgroundColor: color.tint }} />
      <View className="flex-row items-start gap-2">
        <Text weight="semibold" numberOfLines={2} className="flex-1 text-ink-2" style={{ fontSize: 13, lineHeight: 17 }}>
          {label}
        </Text>
        <View className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: colors.elevated }}>
          <Icon icon={icon} size={16} rawColor={color.solid} />
        </View>
      </View>
      <View className="gap-0.5">
        <View className="flex-row items-center justify-between gap-2">
          <Text mono weight="bold" maxFontSizeMultiplier={1.2} style={{ fontSize: 30, lineHeight: 34, letterSpacing: -0.5, color: color.solid }}>
            {value === undefined ? '–' : String(value)}
          </Text>
          {/* Tells the tile opens a list. */}
          <View className="h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: color.tint }}>
            <Icon icon={ChevronRightIcon} size={16} weight="bold" rawColor={color.solid} />
          </View>
        </View>
        {hint ? (
          <Text numberOfLines={1} className={hintDanger ? 'text-danger' : 'text-muted'} style={{ fontSize: 12, lineHeight: 16 }}>
            {hint}
          </Text>
        ) : null}
      </View>
    </PressableCard>
  );
}
