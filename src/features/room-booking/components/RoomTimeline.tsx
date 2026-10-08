import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Pattern, Rect, Stop } from 'react-native-svg';

import { sameId } from '@/core/session/userTypes';
import { useTheme } from '@/core/theme/ThemeProvider';
import { formatMinutes, minutesOfDay, todayKey, type DateKey } from '@/core/time/vn';
import { useNow } from '@/shared/hooks/useNow';
import { initialsOf } from '@/shared/ui/Avatar';
import { Icon } from '@/shared/ui/Icon';
import { CheckIcon, LockIcon, UsersIcon } from '@/shared/ui/icons';
import { Text } from '@/shared/ui/Text';

import { blockTime, isRoomBusy, type CrossLevel, type TimelineBlock } from '../logic';
import type { RoomDto } from '../types';

export const HOUR_HEIGHT = 66;
export const COLUMN_WIDTH = 96;
/** Hour labels column. */
export const AXIS_WIDTH = 42;
const HEAD_HEIGHT = 60;
const BLOCK_INSET = 3;
const FADE_WIDTH = 28;

export type SlotSelection = { roomId: string; startMin: number; endMin: number };

type Props = {
  rooms: RoomDto[];
  blocksByRoom: Record<string, TimelineBlock[]>;
  crossLevel: (room: RoomDto) => CrossLevel;
  dateKey: DateKey;
  startHour: number;
  endHour: number;
  selection: SlotSelection | null;
  blockTitle: (block: TimelineBlock) => string;
  onPressBlock: (block: TimelineBlock) => void;
  onPressSlot: (room: RoomDto, minute: number) => void;
  /** Bottom padding so the last hour can scroll above overlays. */
  bottomInset?: number;
};

function Stripes({ color, background }: { color: string; background: string }) {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        {/* Diagonal strokes drawn in the tile (a rotated pattern renders as dots on some devices). */}
        <Pattern id="stripes" patternUnits="userSpaceOnUse" width="9" height="9">
          <Path d="M-2,2 L2,-2 M0,9 L9,0 M7,11 L11,7" stroke={color} strokeWidth={2.4} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={background} />
      <Rect width="100%" height="100%" fill="url(#stripes)" />
    </Svg>
  );
}

/**
 * Room schedule of design 3a: time runs down (66pt per hour, dashed half hours), one 96pt column per
 * room under a fixed hour axis; column heads follow the horizontal scroll. Approved blocks are green
 * with a 3pt left bar, pending ones blue and striped, the current time a red line.
 */
export function RoomTimeline({ rooms, blocksByRoom, crossLevel, dateKey, startHour, endHour, selection, blockTitle, onPressBlock, onPressSlot, bottomInset = 24 }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useSharedValue(0);
  const [viewport, setViewport] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const now = useNow();
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  const gridStart = startHour * 60;
  const height = (endHour - startHour) * HOUR_HEIGHT;
  const columnsWidth = rooms.length * COLUMN_WIDTH;
  const isToday = dateKey === todayKey(now);
  const nowMin = minutesOfDay(now);
  const y = (minute: number) => ((minute - gridStart) / 60) * HOUR_HEIGHT;
  const showNow = isToday && nowMin >= gridStart && nowMin <= endHour * 60;
  const nowY = y(nowMin);
  // Rooms not yet scrolled into view: the "+N" chip in the corner.
  const hidden = viewport ? Math.max(0, rooms.length - Math.floor((offsetX + viewport + 8) / COLUMN_WIDTH)) : 0;

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.set(event.contentOffset.x);
  });
  const headStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -scrollX.get() }] }));

  // Scroll to an hour before now (or to the first hour) whenever the day changes.
  useEffect(() => {
    const target = isToday ? nowMin - 60 : gridStart;
    const timer = setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, y(target)), animated: false }), 60);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey, startHour]);

  const onColumnPress = (room: RoomDto) => (event: GestureResponderEvent) => {
    const minute = gridStart + Math.floor(((event.nativeEvent.locationY / HOUR_HEIGHT) * 60) / 30) * 30;
    onPressSlot(room, minute);
  };

  return (
    <View className="flex-1">
      {/* Column heads: fixed vertically, follow the horizontal scroll of the grid. */}
      <View className="flex-row border-b border-line-2" style={{ height: HEAD_HEIGHT }}>
        <View className="items-center justify-center border-r border-line-2" style={{ width: AXIS_WIDTH }}>
          <Text mono maxFontSizeMultiplier={1} className="text-subtle" style={{ fontSize: 9.5, lineHeight: 12 }}>
            {t('rooms.timezone')}
          </Text>
        </View>
        <View className="flex-1 overflow-hidden" onLayout={(e) => setViewport(e.nativeEvent.layout.width)}>
          <Animated.View style={[{ flexDirection: 'row', height: HEAD_HEIGHT }, headStyle]}>
            {rooms.map((room) => {
              const locked = crossLevel(room) === 'blocked';
              const busy = isToday && isRoomBusy(blocksByRoom[room.id] ?? [], nowMin);
              return (
                <View key={room.id} testID={`timeline-head-${room.id}`} style={{ width: COLUMN_WIDTH }} className="justify-center gap-0.5 border-r border-line-2 px-2">
                  <View className="flex-row items-center gap-1">
                    {locked ? <Icon icon={LockIcon} size={11} weight="bold" color="subtle" /> : null}
                    <Text weight="bold" numberOfLines={1} maxFontSizeMultiplier={1.15} className="flex-shrink" style={{ fontSize: 12, lineHeight: 16, color: locked ? colors.subtle : colors.ink }}>
                      {room.name}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Icon icon={UsersIcon} size={10} color="subtle" />
                    <Text mono maxFontSizeMultiplier={1.1} className="text-subtle" style={{ fontSize: 10, lineHeight: 13 }}>
                      {String(room.numberOfSeats ?? 0)}
                    </Text>
                    {isToday && !locked ? (
                      <>
                        <View className="ml-0.5 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: busy ? colors.danger : colors.success }} />
                        <Text weight="semibold" numberOfLines={1} maxFontSizeMultiplier={1.1} style={{ fontSize: 10, lineHeight: 13, color: busy ? colors['danger-text'] : colors['success-text'] }}>
                          {busy ? t('rooms.inUse') : t('rooms.free')}
                        </Text>
                      </>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </Animated.View>
        </View>
        {hidden > 0 ? (
          <View pointerEvents="none" className="absolute right-2 top-3.5 h-6 min-w-[28px] items-center justify-center rounded-full bg-inverse px-1.5">
            <Text weight="bold" maxFontSizeMultiplier={1} className="text-on-inverse" style={{ fontSize: 11, lineHeight: 14 }}>
              {`+${hidden}`}
            </Text>
          </View>
        ) : null}
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingTop: 10, paddingBottom: bottomInset }} showsVerticalScrollIndicator={false}>
        <View style={{ height: height + 10, flexDirection: 'row' }}>
          {/* Hour axis. */}
          <View style={{ width: AXIS_WIDTH, height }}>
            {hours.map((hour) => {
              const top = y(hour * 60);
              const covered = showNow && Math.abs(top - nowY) < 14;
              return covered ? null : (
                <Text key={hour} mono numberOfLines={1} maxFontSizeMultiplier={1} className="absolute text-subtle" style={{ top: top - 7, left: 4, fontSize: 10.5, lineHeight: 14 }}>
                  {`${String(hour).padStart(2, '0')}:00`}
                </Text>
              );
            })}
          </View>

          <Animated.ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            onMomentumScrollEnd={(e) => setOffsetX(e.nativeEvent.contentOffset.x)}
            onScrollEndDrag={(e) => setOffsetX(e.nativeEvent.contentOffset.x)}
            scrollEventThrottle={16}
            contentContainerStyle={{ width: columnsWidth }}
          >
            <View style={{ width: columnsWidth, height }}>
              {/* Hour lines, dashed half hours, column separators. */}
              {hours.map((hour) => (
                <View key={`h-${hour}`} pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: y(hour * 60), height: 1, backgroundColor: colors['line-2'] }} />
              ))}
              {hours.slice(0, -1).map((hour) => (
                <View
                  key={`m-${hour}`}
                  pointerEvents="none"
                  style={{ position: 'absolute', left: 0, right: 0, top: y(hour * 60 + 30), height: 0, borderTopWidth: 1, borderStyle: 'dashed', borderColor: colors['line-2'] }}
                />
              ))}
              {rooms.map((room, index) => (
                <View key={`sep-${room.id}`} pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: (index + 1) * COLUMN_WIDTH - 1, width: 1, backgroundColor: colors['line-2'] }} />
              ))}

              {rooms.map((room, index) => {
                const locked = crossLevel(room) === 'blocked';
                return (
                  <View key={room.id} style={{ position: 'absolute', top: 0, left: index * COLUMN_WIDTH + 4, width: COLUMN_WIDTH - 9, height }}>
                    {locked ? (
                      <View className="flex-1 overflow-hidden rounded-[10px]" style={{ marginVertical: BLOCK_INSET }}>
                        <Stripes color={colors['line-2']} background={colors.elevated} />
                      </View>
                    ) : (
                      <Pressable
                        testID={`timeline-column-${index}`}
                        accessibilityRole="button"
                        accessibilityLabel={room.name ?? ''}
                        accessibilityHint={t('booking.ghostBook')}
                        onPress={onColumnPress(room)}
                        style={StyleSheet.absoluteFill}
                      />
                    )}

                    {(blocksByRoom[room.id] ?? []).map((block) => {
                      const top = Math.max(0, y(block.startMin)) + BLOCK_INSET;
                      const blockHeight = Math.max(26, y(block.endMin) - y(block.startMin) - BLOCK_INSET * 2);
                      const pending = block.kind === 'pending' || block.kind === 'cluster';
                      const finished = block.kind === 'finished';
                      const fg = pending ? colors['primary-tint-text'] : finished ? colors['off-text'] : colors['approved-block-text'];
                      const title = block.kind === 'cluster' ? t('rooms.pendingCluster', { count: block.bookings.length }) : blockTitle(block);
                      const roomy = blockHeight >= 52;
                      const creator = block.bookings[0]?.user?.fullname;
                      return (
                        <Pressable
                          key={block.key}
                          testID={`timeline-block-${block.bookings[0]?.code ?? block.key}`}
                          accessibilityRole="button"
                          accessibilityLabel={`${title} ${formatMinutes(block.startMin)}–${formatMinutes(block.endMin)}`}
                          onPress={() => onPressBlock(block)}
                          style={{
                            position: 'absolute',
                            top,
                            left: 0,
                            right: 0,
                            height: blockHeight,
                            borderRadius: 10,
                            overflow: 'hidden',
                            paddingLeft: pending ? 7 : 9,
                            paddingRight: 6,
                            paddingVertical: roomy ? 6 : 3,
                            gap: 2,
                            backgroundColor: pending ? colors['primary-tint'] : finished ? colors['off-tint'] : colors['approved-tint'],
                          }}
                        >
                          {pending ? <Stripes color={colors.elevated} background={colors['primary-tint']} /> : null}
                          {!pending ? (
                            <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: finished ? colors.subtle : colors.success }} />
                          ) : null}
                          <Text weight="bold" numberOfLines={roomy ? 2 : 1} maxFontSizeMultiplier={1.1} style={{ fontSize: 11.5, lineHeight: 14, color: fg }}>
                            {title}
                          </Text>
                          {roomy ? (
                            <Text mono weight="medium" numberOfLines={1} maxFontSizeMultiplier={1.1} style={{ fontSize: 10, lineHeight: 13, color: fg, opacity: 0.85 }}>
                              {blockTime(block)}
                            </Text>
                          ) : null}
                          {blockHeight >= 72 && creator ? (
                            <View className="mt-auto h-[18px] w-[18px] items-center justify-center rounded-full bg-elevated">
                              <Text weight="bold" maxFontSizeMultiplier={1} style={{ fontSize: 8, lineHeight: 10, color: fg }}>
                                {initialsOf(creator)}
                              </Text>
                            </View>
                          ) : null}
                        </Pressable>
                      );
                    })}

                    {selection && sameId(selection.roomId, room.id) ? (
                      <View
                        pointerEvents="none"
                        testID="timeline-selection"
                        className="justify-center gap-0.5 px-2"
                        style={{
                          position: 'absolute',
                          top: y(selection.startMin) + BLOCK_INSET,
                          left: -2,
                          right: -2,
                          height: Math.max(44, y(selection.endMin) - y(selection.startMin) - BLOCK_INSET * 2),
                          borderRadius: 10,
                          backgroundColor: colors.primary,
                          boxShadow: '0px 8px 20px rgba(0, 83, 155, 0.28)',
                        }}
                      >
                        <View className="absolute -top-1 left-1/2 h-1.5 w-5 rounded-full bg-white" style={{ marginLeft: -10 }} />
                        <View className="flex-row items-center gap-1">
                          <Icon icon={CheckIcon} size={11} weight="bold" color="on-primary" />
                          <Text weight="bold" numberOfLines={1} className="text-on-primary" style={{ fontSize: 11.5, lineHeight: 14 }}>
                            {t('rooms.selecting')}
                          </Text>
                        </View>
                        <Text mono weight="semibold" numberOfLines={1} className="text-on-primary" style={{ fontSize: 10.5, lineHeight: 13 }}>
                          {`${formatMinutes(selection.startMin)}–${formatMinutes(selection.endMin)}`}
                        </Text>
                        <View className="absolute -bottom-1 left-1/2 h-1.5 w-5 rounded-full bg-white" style={{ marginLeft: -10 }} />
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </Animated.ScrollView>

          {/* "Now": red line across the columns with its time on the axis. */}
          {showNow ? (
            <>
              <View pointerEvents="none" style={{ position: 'absolute', left: AXIS_WIDTH, right: 0, top: nowY - 1, height: 2, backgroundColor: colors.danger }} />
              <View pointerEvents="none" className="absolute h-2 w-2 rounded-full bg-danger" style={{ left: AXIS_WIDTH - 4, top: nowY - 4 }} />
              <Text testID="timeline-now" mono weight="bold" maxFontSizeMultiplier={1} className="absolute text-danger" style={{ left: 2, top: nowY - 7, fontSize: 10.5, lineHeight: 14 }}>
                {formatMinutes(nowMin)}
              </Text>
            </>
          ) : null}
        </View>
      </ScrollView>

      {/* Fade on the right edge: more rooms to scroll to. */}
      {hidden > 0 ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: HEAD_HEIGHT, right: 0, bottom: 0, width: FADE_WIDTH }}>
          <Svg width={FADE_WIDTH} height="100%">
            <Defs>
              <LinearGradient id="timelineFade" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={colors.elevated} stopOpacity={0} />
                <Stop offset="1" stopColor={colors.elevated} stopOpacity={1} />
              </LinearGradient>
            </Defs>
            <Rect width={FADE_WIDTH} height="100%" fill="url(#timelineFade)" />
          </Svg>
        </View>
      ) : null}
    </View>
  );
}
