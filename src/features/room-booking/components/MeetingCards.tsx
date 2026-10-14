import { useTranslation } from 'react-i18next';
import { Linking, Pressable, View } from 'react-native';

import { roomPerson, type RoomUser } from '@/core/session/userTypes';
import { useTheme } from '@/core/theme/ThemeProvider';
import { cn } from '@/shared/lib/cn';
import { Avatar, AvatarStack } from '@/shared/ui/Avatar';
import { Button } from '@/shared/ui/Button';
import { Card, Divider, FloatingCard } from '@/shared/ui/Card';
import { Icon } from '@/shared/ui/Icon';
import { ChevronRightIcon, DoorOpenIcon, FileTextIcon, LinkIcon, PhoneIcon } from '@/shared/ui/icons';
import { PersonRow } from '@/shared/ui/PersonRow';
import { RoundIcon } from '@/shared/ui/RoundIcon';
import { Tag } from '@/shared/ui/StatusBadge';
import { Text } from '@/shared/ui/Text';

import { AttachmentType, type BookingAttachment, type BookingDto, type ParticipantDto, type ServiceDto } from '../types';
import { serviceIcon } from '../utils/serviceIcon';

export type MeetingParticipant = ParticipantDto & { user: RoomUser };

/** People listed on the card before "và N người khác". */
const INLINE_PEOPLE = 4;

/** Card title with the count in mono and an optional "Xem tất cả ›" link. */
function CardHeading({ title, count, action, onAction }: { title: string; count?: number; action?: string; onAction?: () => void }) {
  return (
    <View className="min-h-[24px] flex-row items-center gap-2">
      <Text weight="bold" accessibilityRole="header" numberOfLines={1} className="flex-shrink" style={{ fontSize: 15, lineHeight: 20 }}>
        {title}
      </Text>
      {count ? (
        <Text mono weight="bold" className="text-subtle" style={{ fontSize: 13, lineHeight: 18 }}>
          {String(count)}
        </Text>
      ) : null}
      <View className="flex-1" />
      {action && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={10} className="flex-row items-center gap-0.5 active:opacity-60">
          <Text weight="semibold" className="text-primary" style={{ fontSize: 13, lineHeight: 17 }}>
            {action}
          </Text>
          <Icon icon={ChevronRightIcon} size={14} weight="bold" color="primary" />
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Where and who (floats over the header): the room with its code, area and seats and how many attend,
 * then the organiser with the contact phone and a call button.
 */
export function PlaceCard({ booking }: { booking: BookingDto }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const room = booking.room;
  const seats = room?.numberOfSeats ?? null;
  const people = booking.numberOfParticipants ?? 0;
  const over = seats != null && people > seats;
  const roomMeta = [room?.code2 ?? room?.code, room?.area?.name ?? room?.areaName, seats != null ? t('meeting.seats', { count: seats }) : null].filter(Boolean).join(' · ');
  const organizer = booking.user;
  const phone = booking.phoneNumber?.trim();

  return (
    <FloatingCard radius={20} testID="meeting-place">
      <View className="flex-row items-center gap-3 px-4 py-3">
        <RoundIcon icon={DoorOpenIcon} size={36} square />
        <View className="min-w-0 flex-1 gap-0.5">
          <Text weight="bold" numberOfLines={1} className="text-ink" style={{ fontSize: 14.5, lineHeight: 19 }}>
            {room?.name ?? '—'}
          </Text>
          {roomMeta ? (
            <Text numberOfLines={1} className="text-muted" style={{ fontSize: 11.5, lineHeight: 15 }}>
              {roomMeta}
            </Text>
          ) : null}
        </View>
        <View className="items-end">
          <Text mono weight="bold" style={{ fontSize: 16, lineHeight: 20, color: over ? colors.warning : colors.ink }}>
            {String(people)}
          </Text>
          <Text className="text-muted" style={{ fontSize: 10.5, lineHeight: 13 }}>
            {t('meeting.attending')}
          </Text>
        </View>
      </View>
      {organizer ? (
        <>
          <Divider inset={16} className="mr-4" />
          <View className="flex-row items-center gap-3 px-4 py-2.5">
            <Avatar name={organizer.fullname ?? organizer.username} uri={organizer.avatarUrl} size={36} />
            <View className="min-w-0 flex-1 gap-0.5">
              <Text weight="semibold" numberOfLines={1} className="text-ink" style={{ fontSize: 14, lineHeight: 18 }}>
                {organizer.fullname ?? organizer.username}
              </Text>
              <Text numberOfLines={1} className="text-muted" style={{ fontSize: 11.5, lineHeight: 15 }}>
                {t('meeting.organizer')}
                {phone ? ' · ' : null}
                {phone ? (
                  <Text mono className="text-muted" style={{ fontSize: 11.5, lineHeight: 15 }}>
                    {phone}
                  </Text>
                ) : null}
              </Text>
            </View>
            {phone ? (
              <Pressable
                testID="meeting-call"
                accessibilityRole="button"
                accessibilityLabel={t('meeting.call', { phone })}
                onPress={() => void Linking.openURL(`tel:${phone}`)}
                hitSlop={6}
                className="h-9 w-9 items-center justify-center rounded-[11px] bg-primary-tint active:opacity-70"
              >
                <Icon icon={PhoneIcon} size={15} color="primary" />
              </Pressable>
            ) : null}
          </View>
        </>
      ) : null}
    </FloatingCard>
  );
}

/** "Chủ trì" / "Chuẩn bị ND" tags of a participant. */
export function RoleTags({ p }: { p: MeetingParticipant }) {
  const { t } = useTranslation();
  if (!p.isHost && !p.isPrepareContent) return null;
  return (
    <View className="flex-row gap-1">
      {p.isHost ? <Tag kind="wait" label={t('booking.host')} /> : null}
      {p.isPrepareContent ? <Tag kind="warn" label={t('booking.prepare')} /> : null}
    </View>
  );
}

/** Host first, then whoever prepares content, then the rest in their original order. */
export function sortParticipants(list: MeetingParticipant[]) {
  const rank = (p: MeetingParticipant) => (p.isHost ? 0 : p.isPrepareContent ? 1 : 2);
  return list.map((p, i) => ({ p, i })).sort((a, b) => rank(a.p) - rank(b.p) || a.i - b.i).map(({ p }) => p);
}

/**
 * People of the meeting listed inline (host and content roles as tags), "và N người khác" for the rest,
 * then the free-text attendees ("Thành phần tham gia") in full.
 */
export function ParticipantsCard({ participants, note, onShowAll }: { participants: MeetingParticipant[]; note?: string | null; onShowAll: () => void }) {
  const { t } = useTranslation();
  const people = sortParticipants(participants);
  const shown = people.length > INLINE_PEOPLE ? people.slice(0, INLINE_PEOPLE - 1) : people;
  const rest = people.slice(shown.length);
  const text = note?.trim();

  return (
    <Card testID="meeting-participants" className="gap-1 px-4 pb-3 pt-3.5">
      <CardHeading title={t('meeting.participants')} count={people.length} action={rest.length ? t('meeting.showAll') : undefined} onAction={onShowAll} />
      {shown.map((p, i) => (
        <PersonRow key={p.id} person={roomPerson(p.user)} className={cn('py-2', i > 0 && 'border-t border-line-2')} trailing={<RoleTags p={p} />} />
      ))}
      {rest.length ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('meeting.othersCount', { count: rest.length })}
          onPress={onShowAll}
          className="min-h-[48px] flex-row items-center gap-2.5 border-t border-line-2 py-2 active:opacity-70"
        >
          <AvatarStack size={30} max={4} people={rest.map((p) => ({ name: p.user.fullname, uri: p.user.avatarUrl }))} />
          <Text className="flex-1 text-muted" style={{ fontSize: 13, lineHeight: 17 }}>
            {t('meeting.othersCount', { count: rest.length })}
          </Text>
          <Icon icon={ChevronRightIcon} size={15} color="subtle" />
        </Pressable>
      ) : null}
      {!people.length ? (
        <Text className="py-1.5 text-muted" style={{ fontSize: 13, lineHeight: 18 }}>
          {t('meeting.noParticipants')}
        </Text>
      ) : null}
      {text ? (
        <View className="mt-2 gap-1 rounded-[12px] bg-panel px-3 py-2.5">
          <Text weight="semibold" className="text-muted" style={{ fontSize: 11.5, lineHeight: 15 }}>
            {t('meeting.otherParticipants')}
          </Text>
          <Text className="text-ink-2" style={{ fontSize: 13.5, lineHeight: 19 }}>
            {text}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

/** Services booked with the room, as icon chips. */
export function ServicesCard({ services }: { services: ServiceDto[] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Card testID="meeting-services" className="gap-3 p-4">
      <CardHeading title={t('meeting.services')} count={services.length} />
      <View className="flex-row flex-wrap gap-2">
        {services.map((service) => (
          <View key={service.id} className="h-9 flex-row items-center gap-2 rounded-[10px] bg-panel px-3">
            <Icon icon={serviceIcon(service.name)} size={15} rawColor={colors.warning} />
            <Text weight="semibold" numberOfLines={1} className="text-ink" style={{ fontSize: 13, lineHeight: 17 }}>
              {service.name}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

/** Documents with a "Mở" button each: files download and share, links open. */
export function DocumentsCard({ documents, onOpen }: { documents: BookingAttachment[]; onOpen: (a: BookingAttachment) => void }) {
  const { t } = useTranslation();
  return (
    <Card testID="meeting-documents" className="gap-1 px-4 pb-2 pt-3.5">
      <CardHeading title={t('meeting.documents')} count={documents.length} />
      {documents.map((a, i) => (
        <DocumentLine key={a.id} attachment={a} divider={i > 0} onOpen={() => onOpen(a)} />
      ))}
    </Card>
  );
}

/** Document line (6c): file / link icon box, name, type or host, "Mở". */
function DocumentLine({ attachment: a, divider, onOpen }: { attachment: BookingAttachment; divider?: boolean; onOpen: () => void }) {
  const { t } = useTranslation();
  const link = a.type === AttachmentType.Link;
  const name = a.name ?? '';
  const meta = link ? (a.path ?? name).replace(/^https?:\/\/(www\.)?/i, '').split('/')[0] : (name.split('.').pop() ?? '').toUpperCase();
  return (
    <View className={cn('min-h-[56px] flex-row items-center gap-3 py-2', divider && 'border-t border-line-2')}>
      <View className={cn('h-10 w-10 items-center justify-center rounded-[11px]', link ? 'bg-primary-tint' : 'bg-danger-tint')}>
        <Icon icon={link ? LinkIcon : FileTextIcon} size={18} color={link ? 'primary' : 'danger'} />
      </View>
      <View className="min-w-0 flex-1">
        <Text weight="bold" numberOfLines={1} style={{ fontSize: 14, lineHeight: 19 }}>
          {link ? name.replace(/^https?:\/\/(www\.)?/i, '') : name}
        </Text>
        <Text numberOfLines={1} className="text-muted" style={{ fontSize: 11.5, lineHeight: 15 }}>
          {meta}
        </Text>
      </View>
      <Button size="xs" variant="soft" label={t('meeting.open')} onPress={onOpen} className="rounded-[10px] px-3.5" />
    </View>
  );
}
