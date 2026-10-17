import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { formatKey, formatTime, todayKey, weekdayOf } from '@/core/time/vn';
import { useNow } from '@/shared/hooks/useNow';
import { usePullRefresh } from '@/shared/hooks/usePullRefresh';
import { Button } from '@/shared/ui/Button';
import { Card, FloatingCard } from '@/shared/ui/Card';
import { FilterChip } from '@/shared/ui/Chip';
import { Icon } from '@/shared/ui/Icon';
import { BuildingIcon, CircleCheckIcon, HourglassIcon, ScanQrCodeIcon, UserCheckIcon, UsersIcon } from '@/shared/ui/icons';
import { ModuleHeader } from '@/shared/ui/ModuleHeader';
import { ModuleScreen } from '@/shared/ui/ModuleScreen';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { useHeaderColors } from '@/shared/ui/ScreenShell';
import { SectionTitle } from '@/shared/ui/SectionTitle';
import { CardSkeleton } from '@/shared/ui/Skeleton';
import { EmptyState, ErrorState } from '@/shared/ui/StateViews';
import { StatStrip } from '@/shared/ui/StatStrip';
import type { BadgeKind } from '@/shared/ui/status';
import { StatusBadge, useBadgeColors } from '@/shared/ui/StatusBadge';
import { Text } from '@/shared/ui/Text';

import { useGuestDashboard } from '../hooks/useGuestDashboard';
import type { GuestScheduleItem, GuestVisitStatus } from '../types';
import { minutesBetween, splitMinutes, visitEnd, visitStage, visitStart, type VisitStage } from '../utils/dashboard';

const statusKinds: Record<GuestVisitStatus, BadgeKind> = { pending: 'warn', confirmed: 'ok', checkedIn: 'live', checkedOut: 'off' };

type Filter = 'all' | VisitStage;
const FILTERS: Filter[] = ['all', 'upcoming', 'inside', 'left'];

/** Center of a timeline dot from the top of its row: the rail and the cards line up on it. */
const DOT_Y = 21;

/**
 * "Quản lý lịch khách": today's head count in the header, the counters, then today's visits on a timeline with a
 * "now" line. The group inside shows its progress, the next arrival its countdown. "Quét mã QR" checks a group in.
 */
export function GuestDashboardScreen() {
  const { t } = useTranslation();
  const { fg, text2, text3 } = useHeaderColors();
  const now = useNow(60_000);
  const { data, isLoading, isError, error, refetch } = useGuestDashboard();
  const pull = usePullRefresh(refetch);
  const [filter, setFilter] = useState<Filter>('all');
  const today = todayKey(now);

  const visits = [...(data?.today ?? [])].sort((a, b) => visitStart(a).getTime() - visitStart(b).getTime());
  const count = (f: Filter) => (f === 'all' ? visits.length : visits.filter((v) => visitStage(v) === f).length);
  const shown = filter === 'all' ? visits : visits.filter((v) => visitStage(v) === filter);
  const guests = visits.reduce((sum, v) => sum + v.guestCount, 0);
  const inside = count('inside');
  const nextId = visits.find((v) => visitStage(v) === 'upcoming' && visitStart(v) > now)?.id;
  // The "now" line goes before the first visit still to start, after the last one when all have started (full list only).
  const firstAhead = shown.findIndex((v) => visitStart(v) > now);
  const nowAt = filter !== 'all' || !shown.length ? -1 : firstAhead === -1 ? shown.length : firstAhead;

  const header = (
    <ModuleHeader testID="guests-header" icon={UsersIcon} title={t('guestSchedule.dashboard.title')}>
      <Text weight="bold" style={{ fontSize: 11, lineHeight: 14, letterSpacing: 0.66, color: text3 }}>
        {t('guestSchedule.dashboard.date', { weekday: t(`time.weekday.${String(weekdayOf(today)) as '0'}`), date: formatKey(today) }).toLocaleUpperCase()}
      </Text>
      <View className="mt-1.5 flex-row items-center gap-3" accessible accessibilityLabel={t('guestSchedule.dashboard.heroA11y', { count: guests, groups: visits.length })}>
        <Text weight="bold" maxFontSizeMultiplier={1.1} style={{ marginLeft: -1, fontSize: 52, lineHeight: 58, letterSpacing: -1, color: fg }}>
          {data ? String(guests) : '–'}
        </Text>
        <View className="flex-1">
          <Text weight="bold" style={{ fontSize: 17, lineHeight: 22, color: fg }}>
            {t('guestSchedule.dashboard.heroUnit')}
          </Text>
          <Text weight="medium" numberOfLines={1} style={{ fontSize: 13, lineHeight: 18, color: text2 }}>
            {inside ? t('guestSchedule.dashboard.heroInside', { groups: visits.length, inside }) : t('guestSchedule.dashboard.heroGroups', { groups: visits.length })}
          </Text>
        </View>
      </View>
    </ModuleHeader>
  );

  const floating = (
    <FloatingCard>
      <StatStrip
        stacked
        testID="guests-stats"
        items={[
          { key: 'total', icon: UsersIcon, tone: 'wait', value: data?.stats.total ?? '–', label: t('guestSchedule.dashboard.statTotal') },
          { key: 'pending', icon: HourglassIcon, tone: 'warn', value: data?.stats.pending ?? '–', label: t('guestSchedule.dashboard.statPending') },
          { key: 'confirmed', icon: CircleCheckIcon, tone: 'ok', value: data?.stats.confirmed ?? '–', label: t('guestSchedule.dashboard.statConfirmed') },
        ]}
      />
    </FloatingCard>
  );

  const footer = <Button testID="guests-scan" className="flex-1" size="xl" icon={ScanQrCodeIcon} label={t('guestSchedule.dashboard.scan')} onPress={() => router.push('/guests/scan')} />;

  return (
    <ModuleScreen
      testID="guests-dashboard"
      header={header}
      floating={floating}
      footer={footer}
      refreshControl={<RefreshControl refreshing={pull.refreshing} onRefresh={() => void pull.onRefresh()} />}
    >
      <SectionTitle className="mt-1">{t('guestSchedule.dashboard.today')}</SectionTitle>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 flex-grow-0" contentContainerClassName="gap-2 px-4">
        {FILTERS.map((f) => (
          <FilterChip
            key={f}
            testID={`guests-filter-${f}`}
            selected={filter === f}
            label={t('guestSchedule.dashboard.filterCount', { label: t(`guestSchedule.dashboard.filter.${f}`), count: count(f) })}
            onPress={() => setFilter(f)}
          />
        ))}
      </ScrollView>

      {isLoading ? (
        <>
          <CardSkeleton lines={3} />
          <CardSkeleton lines={3} />
        </>
      ) : isError && !data ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : shown.length ? (
        <View testID="guests-timeline" className="mt-1">
          {shown.map((visit, i) => (
            <View key={visit.id}>
              {i === nowAt ? <NowRow now={now} first={i === 0} /> : null}
              <TimelineRow visit={visit} now={now} next={visit.id === nextId} first={i === 0 && nowAt !== 0} last={i === shown.length - 1 && nowAt !== shown.length} />
            </View>
          ))}
          {nowAt === shown.length ? <NowRow now={now} last /> : null}
        </View>
      ) : (
        <EmptyState testID="guests-empty" icon={UsersIcon} message={filter === 'all' ? t('guestSchedule.dashboard.todayEmpty') : t('guestSchedule.dashboard.filterEmpty')} />
      )}
    </ModuleScreen>
  );
}

/** Left column of a timeline row: start time over end time. */
function TimeColumn({ from, to }: { from: string; to: string }) {
  return (
    <View className="w-[44px] pt-3">
      <Text mono weight="bold" className="text-ink" style={{ fontSize: 13, lineHeight: 17 }}>
        {from}
      </Text>
      <Text mono className="text-subtle" style={{ fontSize: 11, lineHeight: 14 }}>
        {to}
      </Text>
    </View>
  );
}

/** The vertical line through a row; it stops at the dot on the first and last row. */
function RailLine({ first, last }: { first?: boolean; last?: boolean }) {
  const { colors } = useTheme();
  if (first && last) return null;
  return <View pointerEvents="none" style={{ position: 'absolute', left: 9, width: 2, top: first ? DOT_Y : 0, ...(last ? { height: DOT_Y } : { bottom: 0 }), backgroundColor: colors['line-strong'] }} />;
}

/** One visit: time on the left, a dot in its status color on the rail, the card on the right. */
function TimelineRow({ visit, now, next, first, last }: { visit: GuestScheduleItem; now: Date; next: boolean; first?: boolean; last?: boolean }) {
  const kind = statusKinds[visit.status];
  const dot = useBadgeColors(kind === 'live' ? 'ok' : kind);
  const { colors } = useTheme();
  const stage = visitStage(visit);
  return (
    <View className="flex-row pb-3">
      <TimeColumn from={formatTime(visitStart(visit))} to={formatTime(visitEnd(visit))} />
      <View className="w-5 items-center">
        <RailLine first={first} last={last} />
        <View
          className="items-center justify-center rounded-full"
          style={{ marginTop: DOT_Y - 7, width: 14, height: 14, borderWidth: 3, borderColor: stage === 'left' ? colors['line-strong'] : dot.fg, backgroundColor: stage === 'inside' ? dot.fg : colors.canvas }}
        />
      </View>
      <View className="min-w-0 flex-1 pl-2">
        <VisitCard visit={visit} now={now} next={next} />
      </View>
    </View>
  );
}

/** "11:16 ● Bây giờ ────": where the clock is among today's visits. */
function NowRow({ now, first, last }: { now: Date; first?: boolean; last?: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View className="flex-row items-center pb-3" accessibilityLabel={t('guestSchedule.dashboard.now', { time: formatTime(now) })}>
      <Text mono weight="bold" className="w-[44px] text-danger" style={{ fontSize: 12, lineHeight: 16 }}>
        {formatTime(now)}
      </Text>
      <View className="w-5 items-center justify-center self-stretch">
        {/* Through the row and its bottom padding to the next dot; it starts at the dot when nothing is above. */}
        {last ? null : <View pointerEvents="none" style={{ position: 'absolute', left: 9, width: 2, top: first ? '50%' : 0, bottom: -12, backgroundColor: colors['line-strong'] }} />}
        <View className="h-2.5 w-2.5 rounded-full bg-danger" />
      </View>
      <View className="flex-1 flex-row items-center gap-2 pl-2">
        <Text weight="bold" className="text-danger" style={{ fontSize: 11.5, lineHeight: 15 }}>
          {t('guestSchedule.dashboard.nowLabel')}
        </Text>
        <View className="h-[1.5px] flex-1 bg-danger" style={{ opacity: 0.6 }} />
      </View>
    </View>
  );
}

/**
 * The group: a green "Đang trong công ty" strip with the time left while inside; otherwise the status and, for the next
 * arrival, the countdown. Then the name, the company and who receives them. Gone groups are dimmed.
 */
function VisitCard({ visit, now, next }: { visit: GuestScheduleItem; now: Date; next: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const stage = visitStage(visit);
  const start = visitStart(visit);
  const end = visitEnd(visit);
  const duration = (minutes: number) => {
    const { h, m } = splitMinutes(minutes);
    if (!h) return t('guestSchedule.dashboard.durationMin', { m });
    return m ? t('guestSchedule.dashboard.durationHourMin', { h, m }) : t('guestSchedule.dashboard.durationHour', { h });
  };
  const insideNow = stage === 'inside' && now >= start && now < end;
  const untilStart = minutesBetween(now, start);
  const late = stage === 'upcoming' && untilStart < 0;

  return (
    <Card testID={`guests-visit-${visit.id}`} highlight={next} style={{ opacity: stage === 'left' ? 0.72 : 1 }}>
      {insideNow ? (
        <View className="h-[34px] flex-row items-center gap-2.5 bg-success-tint px-3.5">
          <View className="h-3 w-3 items-center justify-center rounded-full bg-success">
            <View className="h-1.5 w-1.5 rounded-full bg-white" />
          </View>
          <Text weight="bold" numberOfLines={1} className="text-success-text" style={{ fontSize: 12, lineHeight: 16 }}>
            {t('guestSchedule.dashboard.insideNow')}
          </Text>
          <View className="flex-1">
            <ProgressBar value={(now.getTime() - start.getTime()) / Math.max(1, end.getTime() - start.getTime())} color={colors.success} height={5} />
          </View>
          <Text weight="bold" className="text-success-text" style={{ fontSize: 11.5, lineHeight: 15 }}>
            {t('guestSchedule.dashboard.timeLeft', { time: duration(minutesBetween(now, end)) })}
          </Text>
        </View>
      ) : null}

      <View className="gap-1.5 px-3.5 pb-3 pt-3">
        {insideNow ? null : (
          <View className="flex-row items-center gap-2">
            <StatusBadge kind={statusKinds[visit.status]} label={t(`guestSchedule.dashboard.status.${visit.status}`)} />
            <View className="flex-1" />
            {next ? (
              <Text weight="bold" className="text-primary" style={{ fontSize: 12, lineHeight: 16 }}>
                {t('guestSchedule.dashboard.startsIn', { time: duration(untilStart) })}
              </Text>
            ) : late ? (
              <Text weight="semibold" className="text-danger" style={{ fontSize: 12, lineHeight: 16 }}>
                {t('guestSchedule.dashboard.late', { time: duration(untilStart) })}
              </Text>
            ) : null}
          </View>
        )}
        <Text weight="bold" numberOfLines={2} className="text-ink" style={{ fontSize: 15.5, lineHeight: 21 }}>
          {visit.groupName}
        </Text>
        {visit.company ? <MetaLine icon={BuildingIcon} text={visit.company} /> : null}
        <View className="mt-1 flex-row items-center gap-2 border-t border-line-2 pt-2.5">
          <View className="flex-row items-center gap-1.5 rounded-full bg-panel px-2.5 py-1">
            <Icon icon={UsersIcon} size={13} color="primary" />
            <Text weight="bold" className="text-ink-2" style={{ fontSize: 12, lineHeight: 16 }}>
              {t('guestSchedule.dashboard.guests', { count: visit.guestCount })}
            </Text>
          </View>
          {visit.host ? (
            <View className="min-w-0 flex-1">
              <MetaLine icon={UserCheckIcon} text={visit.host} />
            </View>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

function MetaLine({ icon, text }: { icon: typeof BuildingIcon; text: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <Icon icon={icon} size={14} color="muted" />
      <Text numberOfLines={1} className="min-w-0 flex-1 text-muted" style={{ fontSize: 12.5, lineHeight: 17 }}>
        {text}
      </Text>
    </View>
  );
}
