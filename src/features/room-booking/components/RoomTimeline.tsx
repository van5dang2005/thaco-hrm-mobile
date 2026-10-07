import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Pattern, Rect, Stop } from 'react-native-svg';

import { sameId } from '@/core/session/userTypes';
import { useTheme } from '@/core/theme/ThemeProvider';
import { formatMinutes, minutesOfDay, todayKey, type DateKey } from '@/core/time/vn';
import { useNow } from '@/shared/hooks/useNow';
import { Icon } from '@/shared/ui/Icon';
import { LockIcon, PlusIcon } from '@/shared/ui/icons';
import { Text } from '@/shared/ui/Text';

import { blockTime, isRoomBusy, type CrossLevel, type TimelineBlock } from '../logic';
import type { RoomDto } from '../types';

export const HOUR_HEIGHT = 80;
export const COLUMN_WIDTH = 100;
export const COLUMN_GAP = 6;
/** Hour labels: 36 wide, right-aligned, then 8 to the first column. */
export const AXIS_WIDTH = 44;
const HEAD_HEIGHT = 50;
const BLOCK_INSET = 2;
const FADE_WIDTH = 30;
const PILL_HEIGHT = 20;

export type SlotSelection = { roomId: string; startMin: number; endMin: number };

type Props = {
  rooms: RoomDto[];
  blocksByRoom: Record<string, TimelineBlock[]>;
  crossLevel: (room: RoomDto) => CrossLevel;
  roomMeta: (room: RoomDto) => string;
  dateKey: DateKey;
  startHour: number;
  endHour: number;
  selection: SlotSelection | null;
  blockTitle: (block: TimelineBlock) => string;
  onPressBlock: (block: TimelineBlock) => void;
  onPressSlot: (room: RoomDto, minute: number) => void;
  /** Bottom padding so the quick-book bar never covers the last hour. */
  bottomInset?: number;
};

function Stripes({ color, background }: { color: string; background: string }) {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        {/* Diagonal strokes drawn in the tile (a rotated pattern renders as dots on some devices). */}
        <Pattern id="stripes" patternUnits="userSpaceOnUse" width="9" height="9">
          <Path d="M-2,2 L2,-2 M0,9 L9,0 M7,11 L11,7" stroke={color} strokeWidth={3.2} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={background} />
      <Rect width="100%" height="100%" fill="url(#stripes)" />
    </Svg>
  );
}

/**
 * Room schedule of design 3a: time runs down (80pt per hour), one 100pt column per room, columns
 * scroll sideways under a fixed hour axis; the column heads follow the horizontal scroll.
 */
export function RoomTimeline({
  rooms,
  blocksByRoom,
  crossLevel,
  roomMeta,
  dateKey,
  startHour,
  endHour,
  selection,
  blockTitle,
  onPressBlock,
  onPressSlot,
  bottomInset = 40,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useSharedValue(0);
  const now = useNow();
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  const gridStart = startHour * 60;
  const height = (endHour - startHour) * HOUR_HEIGHT;
  const columnsWidth = rooms.length * COLUMN_WIDTH + Math.max(0, rooms.length - 1) * COLUMN_GAP + 16;
  const isToday = dateKey === todayKey(now);
  const nowMin = minutesOfDay(now);
  const y = (minute: number) => ((minute - gridStart) / 60) * HOUR_HEIGHT;
  const showNow = isToday && nowMin >= gridStart && nowMin <= endHour * 60;
  const nowY = y(nowMin);
  const columnX = (index: number) => index * (COLUMN_WIDTH + COLUMN_GAP);

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
      <View className="overflow-hidden border-b border-line-2" style={{ height: HEAD_HEIGHT, marginLeft: 16 + AXIS_WIDTH }}>
        <Animated.View style={[{ flexDirection: 'row', gap: COLUMN_GAP, height: HEAD_HEIGHT }, headStyle]}>
          {rooms.map((room) => {
            const locked = crossLevel(room) === 'blocked';
            const busy = isToday && isRoomBusy(blocksByRoom[room.id] ?? [], nowMin);
            return (
              <View key={room.id} testID={`timeline-head-${room.id}`} style={{ width: COLUMN_WIDTH }} className="justify-center gap-0.5 px-0.5">
                <View className="flex-row items-center gap-[5px]">
                  {locked ? (
                    <Icon icon={LockIcon} size={11} weight="bold" color="subtle" />
                  ) : (
                    <View className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: busy ? colors.warning : colors.success }} />
                  )}
                  <Text weight="semibold" numberOfLines={1} maxFontSizeMultiplier={1.15} className="flex-shrink" style={{ fontSize: 12.5, lineHeight: 16, color: locked ? colors.subtle : colors.ink }}>
                    {room.name}
                  </Text>
                </View>
                <Text numberOfLines={1} maxFontSizeMultiplier={1.15} className="text-subtle" style={{ fontSize: 10.5, lineHeight: 14, paddingLeft: 12 }}>
                  {roomMeta(room)}
                </Text>
              </View>
            );
          })}
        </Animated.View>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingTop: 8, paddingBottom: bottomInset, paddingLeft: 16 }} showsVerticalScrollIndicator={false}>
        <View style={{ height: height + 8, flexDirection: 'row' }}>
          {/* Hour axis. */}
          <View style={{ width: AXIS_WIDTH, height }}>
            {hours.map((hour) => {
              const top = y(hour * 60);
              const covered = showNow && Math.abs(top - nowY) < PILL_HEIGHT;
              return covered ? null : (
                <Text
                  key={hour}
                  mono
                  weight="medium"
                  numberOfLines={1}
                  maxFontSizeMultiplier={1}
                  className="absolute text-right text-subtle"
                  style={{ top: top - 7, left: 0, width: 36, fontSize: 10.5, lineHeight: 14 }}
                >
                  {`${String(hour).padStart(2, '0')}:00`}
                </Text>
              );
            })}
          </View>

          <Animated.ScrollView horizontal showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ width: columnsWidth }}>
            <View style={{ width: columnsWidth, height }}>
              {/* Hour lines and dashed half-hour lines. */}
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

              {rooms.map((room, index) => {
                const locked = crossLevel(room) === 'blocked';
                const left = columnX(index);
                return (
                  <View key={room.id} style={{ position: 'absolute', top: 0, left, width: COLUMN_WIDTH, height }}>
                    {locked ? (
                      <View className="flex-1 overflow-hidden rounded-[12px]" style={{ marginVertical: BLOCK_INSET }}>
                        <Stripes color={colors['line-2']} background={colors.surface} />
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
                      const blockHeight = Math.max(24, y(block.endMin) - y(block.startMin) - BLOCK_INSET * 2);
                      const pending = block.kind === 'pending' || block.kind === 'cluster';
                      const fg = pending ? colors['primary-tint-text'] : block.kind === 'finished' ? colors['off-text'] : colors['approved-block-text'];
                      const title = block.kind === 'cluster' ? t('rooms.pendingCluster', { count: block.bookings.length }) : blockTitle(block);
                      const roomy = blockHeight >= 56;
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
                            borderRadius: 12,
                            overflow: 'hidden',
                            paddingHorizontal: 8,
                            paddingVertical: roomy ? 7 : 4,
                            gap: 3,
                            backgroundColor: pending ? colors['primary-tint'] : block.kind === 'finished' ? colors['off-tint'] : colors['approved-block'],
                            borderWidth: pending ? 1.5 : 0,
                            borderStyle: pending ? 'dashed' : 'solid',
                            borderColor: colors.primary,
                          }}
                        >
                          <Text weight="semibold" numberOfLines={roomy ? 2 : 1} maxFontSizeMultiplier={1.1} style={{ fontSize: 11.5, lineHeight: 15, color: fg }}>
                            {title}
                          </Text>
                          {roomy ? (
                            <Text mono weight="medium" numberOfLines={1} maxFontSizeMultiplier={1.1} style={{ fontSize: 10, lineHeight: 13, color: fg, opacity: 0.8 }}>
                              {blockTime(block)}
                            </Text>
                          ) : null}
                        </Pressable>
                      );
                    })}

                    {selection && sameId(selection.roomId, room.id) ? (
                      <View
                        pointerEvents="none"
                        testID="timeline-selection"
                        className="items-center justify-center gap-1"
                        style={{
                          position: 'absolute',
                          top: y(selection.startMin) + BLOCK_INSET,
                          left: 0,
                          right: 0,
                          height: Math.max(48, y(selection.endMin) - y(selection.startMin) - BLOCK_INSET * 2),
                          borderRadius: 12,
                          borderWidth: 2,
                          borderColor: colors.primary,
                          backgroundColor: colors.surface,
                          boxShadow: '0px 8px 20px rgba(0, 83, 155, 0.22)',
                        }}
                      >
                        <View className="h-[26px] w-[26px] items-center justify-center rounded-full bg-primary">
                          <Icon icon={PlusIcon} size={14} weight="bold" color="on-primary" />
                        </View>
                        <Text mono weight="semibold" numberOfLines={1} className="text-primary" style={{ fontSize: 11, lineHeight: 14 }}>
                          {`${formatMinutes(selection.startMin)}–${formatMinutes(selection.endMin)}`}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </Animated.ScrollView>

          {/* "Now" line across every column, with its time pill on the hour axis. */}
          {showNow ? (
            <>
              <View pointerEvents="none" style={{ position: 'absolute', left: AXIS_WIDTH - 4, right: 0, top: nowY - 1, height: 2, backgroundColor: colors.danger }} />
              <View
                pointerEvents="none"
                testID="timeline-now"
                className="absolute items-center justify-center rounded-full bg-danger"
                style={{ left: 0, top: nowY - PILL_HEIGHT / 2, height: PILL_HEIGHT, width: 42 }}
              >
                <Text mono weight="semibold" maxFontSizeMultiplier={1} className="text-white" style={{ fontSize: 10, lineHeight: 13 }}>
                  {formatMinutes(nowMin)}
                </Text>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>

      {/* Fade on the right edge: more rooms to scroll to. */}
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: FADE_WIDTH }}>
        <Svg width={FADE_WIDTH} height="100%">
          <Defs>
            <LinearGradient id="timelineFade" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={colors.surface} stopOpacity={0} />
              <Stop offset="1" stopColor={colors.surface} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect width={FADE_WIDTH} height="100%" fill="url(#timelineFade)" />
        </Svg>
      </View>
    </View>
  );
}
