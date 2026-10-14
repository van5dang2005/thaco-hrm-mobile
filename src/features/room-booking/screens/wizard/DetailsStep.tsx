import * as DocumentPicker from 'expo-document-picker';
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, Switch, TextInput, View } from 'react-native';
import { z } from 'zod';

import { useRoomMe } from '@/core/session/useMe';
import { roomPerson, sameId, type PersonOf, type RoomUser } from '@/core/session/userTypes';
import { MAX_FONT_SCALE, useFontStyle } from '@/core/theme/fonts';
import { useTheme } from '@/core/theme/ThemeProvider';
import { cn } from '@/shared/lib/cn';
import { AvatarStack } from '@/shared/ui/Avatar';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { CheckIcon, ChevronRightIcon, DoorOpenIcon, LinkIcon, LockIcon, PlusIcon, XIcon } from '@/shared/ui/icons';
import { PersonRow } from '@/shared/ui/PersonRow';
import { RoundIcon } from '@/shared/ui/RoundIcon';
import { Card, FloatingCard } from '@/shared/ui/Card';
import { ModuleScreen } from '@/shared/ui/ModuleScreen';
import { Tag } from '@/shared/ui/StatusBadge';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';
import { toast } from '@/shared/ui/Toast';
import { UserPicker } from '@/shared/ui/UserPicker';

import { roomsApi } from '../../api/room.api';
import { WizardHeader } from '../../components/WizardHeader';
import { useDraftLabels } from '../../hooks/useDraftLabels';
import { useRooms } from '../../hooks/useRooms';
import { useGoToStep } from '../../hooks/useWizardNavigation';
import { useBookingDraft, type DraftParticipant } from '../../store/draftStore';
import { MAX_DOCUMENT_BYTES, MAX_DOCUMENTS } from '../../utils/booking';
import { serviceIcon } from '../../utils/serviceIcon';

/** Same rules as the web form (GeneralInfo / RegistrationInfo); `participant` is nvarchar(255) on the server. */
const detailsSchema = z.object({
  content: z.string().trim().min(1, 'booking.requiredContent').max(500),
  participantText: z.string().trim().min(1, 'booking.requiredParticipantText').max(255),
  phone: z.union([z.literal(''), z.string().regex(/^0/, 'booking.phoneStartZero').regex(/^\d{10,11}$/, 'booking.phoneLength')]),
  links: z.array(z.string().regex(/^https?:\/\/\S+$/i, 'booking.invalidLink')),
});

const asHost = (user: RoomUser): DraftParticipant => ({ user, isHost: true, isPrepareContent: false });

const linkSchema = z.string().trim().regex(/^https?:\/\/\S+$/i);


/** B3 (4c): content, participants, services and documents. */
export function DetailsStep() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const draft = useBookingDraft((s) => s.draft);
  const patch = useBookingDraft((s) => s.patch);
  const goToStep = useGoToStep();
  const labels = useDraftLabels(draft);
  const me = useRoomMe();
  const rooms = useRooms(draft.areaId);
  const room = rooms.data?.find((r) => sameId(r.id, draft.roomId));
  const inputFont = useFontStyle('regular');
  const [picker, setPicker] = useState(false);
  const [people, setPeople] = useState(false);
  const [linkInput, setLinkInput] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contentFocused, setContentFocused] = useState(false);

  // Like the web form, a new booking starts with the organiser as host.
  useEffect(() => {
    if (draft.mode !== 'create' || draft.hostSeeded || !me.data) return;
    const mine = draft.participants.some((p) => sameId(p.user.id, me.data!.id));
    patch({ hostSeeded: true, participants: mine ? draft.participants : [asHost(me.data), ...draft.participants] });
  }, [draft.mode, draft.hostSeeded, draft.participants, me.data, patch]);

  if (!draft.roomId) return <Redirect href="/rooms/book" />;

  const participants = draft.participants;
  const host = participants.find((p) => p.isHost);
  // The 5-document limit (LIMIT_5_ATTACHMENTS) counts files only; links are not limited, as on the web.
  const fileCount = draft.keptAttachments.length + draft.files.length;
  const phone = draft.phone || me.data?.phoneNumber || '';
  const services = (room?.services ?? []).filter((s) => s.isActive !== false);

  const onPickPeople = (picked: PersonOf<RoomUser>[]) => {
    const existing = new Map(participants.map((p) => [p.user.id.toLowerCase(), p]));
    patch({ participants: picked.map((p) => existing.get(p.id.toLowerCase()) ?? { user: p.user, isHost: false, isPrepareContent: false }) });
  };

  const pickFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
    if (result.canceled) return;
    const slots = MAX_DOCUMENTS - fileCount;
    if (slots <= 0) return void toast.error(t('booking.tooManyFiles'));
    const accepted = result.assets.filter((asset) => {
      if ((asset.size ?? 0) > MAX_DOCUMENT_BYTES) {
        toast.error(t('booking.fileTooLarge', { name: asset.name }));
        return false;
      }
      return true;
    });
    if (accepted.length > slots) toast.error(t('booking.tooManyFiles'));
    patch({
      files: [...draft.files, ...accepted.slice(0, Math.max(0, slots)).map((a) => ({ uri: a.uri, name: a.name, type: a.mimeType ?? 'application/octet-stream', size: a.size }))],
    });
  };

  const addDocument = () => {
    // Files are full: only a link can still be added.
    if (fileCount >= MAX_DOCUMENTS) return setLinkInput('');
    Alert.alert(t('booking.addDocument'), undefined, [
      { text: t('booking.addFileOption'), onPress: () => void pickFiles() },
      { text: t('booking.addLinkOption'), onPress: () => setLinkInput('') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const confirmRemove = (name: string, remove: () => void) =>
    Alert.alert(t('booking.removeDocumentTitle'), name, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('booking.removeDocument'), style: 'destructive', onPress: remove },
    ]);

  const addLink = () => {
    const parsed = linkSchema.safeParse(linkInput ?? '');
    if (!parsed.success) return setLinkError(t('booking.invalidLink'));
    patch({ links: [...draft.links, parsed.data] });
    setLinkInput(null);
    setLinkError(null);
  };

  const review = () => {
    const parsed = detailsSchema.safeParse({ content: draft.content, participantText: draft.participantText, phone, links: draft.links });
    if (!parsed.success) {
      setError(t(parsed.error.issues[0].message as 'booking.requiredContent'));
      return;
    }
    setError(null);
    if (!draft.phone && phone) patch({ phone });
    // Web rule: without a chosen host, the organiser becomes the host.
    if (!host && me.data) {
      const mine = participants.some((p) => sameId(p.user.id, me.data!.id));
      patch({ participants: mine ? participants.map((p) => (sameId(p.user.id, me.data!.id) ? { ...p, isHost: true } : p)) : [asHost(me.data), ...participants] });
    }
    router.push('/rooms/book/confirm');
  };

  const header = <WizardHeader testID="booking-details-header" step={3} bottom={44} />;

  const summary = (
    <FloatingCard className="flex-row items-center gap-3 px-3.5 py-3">
      <RoundIcon icon={DoorOpenIcon} size={32} square />
      <Text numberOfLines={1} className="min-w-0 flex-1 text-ink" style={{ fontSize: 12.5, lineHeight: 17 }}>
        <Text weight="bold" style={{ fontSize: 13 }}>
          {room?.name ?? ''}
        </Text>
        {' · '}
        <Text mono weight="medium" style={{ fontSize: 12 }}>
          {labels.time}
        </Text>
        {` · ${labels.dayShort}${labels.recurring ? ` · ×${labels.sessions.length}` : ''}`}
      </Text>
      <Pressable testID="booking-details-edit-time" accessibilityRole="button" accessibilityLabel={t('booking.backToTime')} onPress={() => goToStep('time')} hitSlop={12} className="min-h-[36px] justify-center active:opacity-60">
        <Text weight="bold" className="text-primary" style={{ fontSize: 13.5, lineHeight: 18 }}>
          {t('booking.edit')}
        </Text>
      </Pressable>
    </FloatingCard>
  );

  const footer = (
    <>
      <Button className="flex-1" variant="soft" label={t('common.back')} onPress={() => goToStep('time')} />
      <Button
        testID="booking-content-continue"
        className="flex-[1.7]"
        label={t('common.next')}
        onPress={review}
        trailing={<Icon icon={ChevronRightIcon} size={16} weight="bold" color="on-primary" />}
      />
    </>
  );

  const shownPeople = participants.slice(0, 2);
  const others = participants.slice(2);

  return (
    <ModuleScreen
      header={header}
      floating={summary}
      footer={footer}
      footerNote={
        error ? (
          <Banner tone="danger" testID="booking-details-error">
            {error}
          </Banner>
        ) : null
      }
    >
      <Card className="gap-2.5 p-4">
        <Text weight="semibold" className="text-ink-2" style={{ fontSize: 13, lineHeight: 17 }}>
          {t('booking.contentLabel')}
          <Text weight="semibold" className="text-danger">
            {' *'}
          </Text>
        </Text>
        <TextInput
          testID="booking-content"
          value={draft.content}
          onChangeText={(content) => {
            setError(null);
            patch({ content });
          }}
          onFocus={() => setContentFocused(true)}
          onBlur={() => setContentFocused(false)}
          placeholder={t('booking.contentPlaceholder')}
          placeholderTextColor={colors.subtle}
          multiline
          maxLength={500}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          textAlignVertical="top"
          accessibilityLabel={t('booking.contentLabel')}
          className="min-h-[76px] rounded-[14px] px-3.5 py-3"
          style={{
            fontSize: 14.5,
            lineHeight: 21,
            color: colors.ink,
            ...inputFont,
            backgroundColor: contentFocused ? colors.elevated : colors.panel,
            borderWidth: 1.5,
            borderColor: contentFocused ? colors.primary : 'transparent',
          }}
        />
        <View className="min-h-[40px] flex-row items-center gap-2">
          <Icon icon={LockIcon} size={15} color="ink-2" />
          <Text className="text-ink-2" style={{ fontSize: 13.5, lineHeight: 18 }}>
            {t('booking.confidential')}
          </Text>
          <Text numberOfLines={1} className="flex-1 text-right text-subtle" style={{ fontSize: 11.5, lineHeight: 15 }}>
            {t('booking.confidentialHint')}
          </Text>
          <Switch
            testID="booking-confidential"
            value={draft.confidential}
            onValueChange={(confidential) => patch({ confidential })}
            trackColor={{ true: colors.success, false: colors.track }}
            thumbColor="#FFFFFF"
            ios_backgroundColor={colors.track}
            accessibilityLabel={t('booking.confidential')}
          />
        </View>
      </Card>

      <Card className="gap-1 p-4">
        <CardTitle
          title={t('booking.participantsTitle', { count: participants.length })}
          action={t('common.add')}
          onAction={() => setPicker(true)}
          actionTestID="booking-add-participant"
        />
        {participants.length ? (
          <>
            {shownPeople.map((p, i) => (
              <PersonRow
                key={p.user.id}
                person={roomPerson(p.user)}
                className={cn('py-2', i > 0 && 'border-t border-line-2')}
                onPress={() => setPeople(true)}
                trailing={
                  p.isHost ? <Tag kind="wait" label={t('booking.host')} /> : p.isPrepareContent ? <Tag kind="warn" label={t('booking.prepare')} /> : undefined
                }
              />
            ))}
            {others.length ? (
              <Pressable
                testID="booking-participants"
                accessibilityRole="button"
                accessibilityLabel={`${t('booking.participantsSheet')}: ${participants.map((p) => p.user.fullname).join(', ')}`}
                onPress={() => setPeople(true)}
                className="min-h-[44px] flex-row items-center gap-2.5 border-t border-line-2 pt-2 active:opacity-70"
              >
                <AvatarStack size={26} max={4} people={others.map((p) => ({ name: p.user.fullname, uri: p.user.avatarUrl }))} />
                <Text className="text-muted" style={{ fontSize: 13, lineHeight: 17 }}>
                  {t('booking.andOthers', { count: others.length })}
                </Text>
              </Pressable>
            ) : (
              <Pressable testID="booking-participants" accessibilityRole="button" onPress={() => setPeople(true)} className="min-h-[36px] justify-center border-t border-line-2 pt-1 active:opacity-70">
                <Text weight="semibold" className="text-primary" style={{ fontSize: 12.5, lineHeight: 16 }}>
                  {host ? t('booking.hostIs', { name: host.user.fullname ?? '' }) : t('booking.noHost')}
                </Text>
              </Pressable>
            )}
          </>
        ) : (
          <Text className="py-2 text-muted" style={{ fontSize: 13, lineHeight: 17 }}>
            {t('booking.noParticipants')}
          </Text>
        )}
      </Card>

      <Card className="gap-3 p-4">
        <View className="flex-row items-center justify-between">
          <Text weight="bold" accessibilityRole="header" style={{ fontSize: 15, lineHeight: 20 }}>
            {t('booking.services')}
          </Text>
          {draft.serviceIds.length ? <Tag kind="wait" label={t('booking.servicesSelected', { count: draft.serviceIds.length })} /> : null}
        </View>
        {services.length ? (
          <View className="gap-2">
            {chunk(services, 4).map((row, r) => (
              <View key={r} className="flex-row gap-2">
                {row.map((service) => {
                  const selected = draft.serviceIds.some((id) => sameId(id, service.id));
                  return (
                    <Pressable
                      key={service.id}
                      testID={`booking-service-${service.code ?? service.id}`}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={service.name}
                      onPress={() => patch({ serviceIds: selected ? draft.serviceIds.filter((id) => !sameId(id, service.id)) : [...draft.serviceIds, service.id] })}
                      className="min-h-[78px] min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[14px] px-1 py-2.5 active:opacity-80"
                      style={{ backgroundColor: selected ? colors['primary-tint'] : colors.panel, borderWidth: 1.5, borderColor: selected ? colors.primary : 'transparent' }}
                    >
                      <View className="h-9 w-9 items-center justify-center rounded-[11px]" style={{ backgroundColor: selected ? colors.primary : colors.elevated }}>
                        <Icon icon={serviceIcon(service.name)} size={18} rawColor={selected ? colors['on-primary'] : colors.warning} />
                      </View>
                      <Text weight="semibold" numberOfLines={2} className="text-center" style={{ fontSize: 11.5, lineHeight: 14, color: selected ? colors.primary : colors.ink }}>
                        {service.name}
                      </Text>
                      {selected ? (
                        <View className="absolute right-1 top-1 h-4 w-4 items-center justify-center rounded-full bg-primary">
                          <Icon icon={CheckIcon} size={10} weight="bold" color="on-primary" />
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
                {Array.from({ length: 4 - row.length }, (_, i) => (
                  <View key={`pad-${i}`} className="flex-1" />
                ))}
              </View>
            ))}
          </View>
        ) : (
          <Text className="text-sub text-muted">{t('booking.noServices')}</Text>
        )}
      </Card>

      <Card className="gap-3 p-4">
        <View className="flex-row items-center justify-between">
          <Text weight="bold" accessibilityRole="header" style={{ fontSize: 15, lineHeight: 20 }}>
            {t('booking.documents')}
          </Text>
          <Text className="text-subtle" style={{ fontSize: 11.5, lineHeight: 15 }}>
            {t('booking.documentsLimit', { count: fileCount })}
          </Text>
        </View>
        <View className="flex-row flex-wrap gap-2">
          {draft.keptAttachments.map((a) => (
            <DocumentChip key={a.id} name={a.name ?? ''} onPress={() => confirmRemove(a.name ?? '', () => patch({ keptAttachments: draft.keptAttachments.filter((x) => x.id !== a.id) }))} />
          ))}
          {draft.files.map((file, index) => (
            <DocumentChip key={`${file.uri}-${index}`} name={file.name} onPress={() => confirmRemove(file.name, () => patch({ files: draft.files.filter((_, i) => i !== index) }))} />
          ))}
          {draft.links.map((link, index) => (
            <DocumentChip key={`${link}-${index}`} name={link} link onPress={() => confirmRemove(link, () => patch({ links: draft.links.filter((_, i) => i !== index) }))} />
          ))}
          <Pressable
            testID="booking-add-document"
            accessibilityRole="button"
            accessibilityLabel={t('booking.addDocument')}
            onPress={addDocument}
            className="h-11 w-11 items-center justify-center rounded-[12px] border-[1.5px] border-dashed border-line-strong active:opacity-70"
          >
            <Icon icon={PlusIcon} size={18} color="muted" />
          </Pressable>
        </View>
      </Card>

      <Card className="gap-3 p-4">
        <Text weight="bold" accessibilityRole="header" style={{ fontSize: 15, lineHeight: 20 }}>
          {t('booking.moreInfo')}
        </Text>
        <TextField
          testID="booking-participant-text"
          appearance="ios"
          label={`${t('booking.otherParticipants')} *`}
          placeholder={t('booking.otherParticipantsPlaceholder')}
          value={draft.participantText}
          maxLength={255}
          onChangeText={(participantText) => {
            setError(null);
            patch({ participantText });
          }}
        />
        <TextField
          testID="booking-phone"
          appearance="ios"
          label={t('booking.phone')}
          keyboardType="number-pad"
          value={phone}
          maxLength={11}
          onChangeText={(value) => {
            setError(null);
            patch({ phone: value.replace(/\D/g, '').slice(0, 11) });
          }}
        />
      </Card>

      <UserPicker<PersonOf<RoomUser>>
        testID="booking-user-picker"
        visible={picker}
        onClose={() => setPicker(false)}
        title={t('booking.pickUsers')}
        cacheKey="room"
        multiple
        initialSelected={participants.map((p) => roomPerson(p.user))}
        search={async (keyword) => (await roomsApi.searchUsers(keyword)).items.map(roomPerson)}
        onConfirm={onPickPeople}
      />
      <ParticipantsSheet visible={people} onClose={() => setPeople(false)} onAdd={() => {
        setPeople(false);
        setPicker(true);
      }} />
      <BottomSheet
        visible={linkInput !== null}
        onClose={() => {
          setLinkInput(null);
          setLinkError(null);
        }}
        title={t('booking.linkTitle')}
        footer={<Button label={t('booking.addLinkConfirm')} onPress={addLink} />}
      >
        <TextField
          appearance="ios"
          value={linkInput ?? ''}
          onChangeText={(value) => {
            setLinkError(null);
            setLinkInput(value);
          }}
          placeholder={t('booking.linkPlaceholder')}
          autoCapitalize="none"
          keyboardType="url"
          autoFocus
          onSubmitEditing={addLink}
          error={linkError ?? undefined}
        />
      </BottomSheet>
    </ModuleScreen>
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

/** Card heading with an optional "+ Thêm" style link. */
function CardTitle({ title, action, onAction, actionTestID }: { title: string; action?: string; onAction?: () => void; actionTestID?: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3 pb-1">
      <Text weight="bold" accessibilityRole="header" numberOfLines={1} className="flex-shrink" style={{ fontSize: 15, lineHeight: 20 }}>
        {title}
      </Text>
      {action && onAction ? (
        <Pressable testID={actionTestID} accessibilityRole="button" onPress={onAction} hitSlop={10} className="active:opacity-60">
          <Text weight="bold" className="text-primary" style={{ fontSize: 13, lineHeight: 17 }}>
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function DocumentChip({ name, link, onPress }: { name: string; link?: boolean; onPress: () => void }) {
  const { t } = useTranslation();
  const ext = (name.split('.').pop() ?? '').slice(0, 4).toUpperCase();
  const label = link ? name.replace(/^https?:\/\/(www\.)?/i, '') : name;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${t('booking.removeDocument')}`}
      onPress={onPress}
      className="h-11 min-w-0 flex-row items-center gap-2 rounded-[12px] bg-field px-2.5 active:opacity-70"
      style={{ flexGrow: 1, flexBasis: 140 }}
    >
      {link ? (
        <Icon icon={LinkIcon} size={16} color="primary" />
      ) : (
        <View className="rounded-[5px] bg-danger-tint px-1.5 py-0.5">
          <Text mono weight="semibold" className="text-meta-sm text-danger-text">
            {ext || 'FILE'}
          </Text>
        </View>
      )}
      <Text numberOfLines={1} className={cn('flex-1 text-sub-sm', link && 'text-primary')}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Each participant with Chủ trì (one host) / Chuẩn bị nội dung toggles. */
function ParticipantsSheet({ visible, onClose, onAdd }: { visible: boolean; onClose: () => void; onAdd: () => void }) {
  const { t } = useTranslation();
  const participants = useBookingDraft((s) => s.draft.participants);
  const patch = useBookingDraft((s) => s.patch);

  const update = (userId: string, change: Partial<DraftParticipant> | null) =>
    patch({
      participants:
        change === null
          ? participants.filter((p) => !sameId(p.user.id, userId))
          : participants.map((p) => {
              if (sameId(p.user.id, userId)) return { ...p, ...change };
              // A meeting has a single host.
              return change.isHost ? { ...p, isHost: false } : p;
            }),
    });

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('booking.participantsSheet')} scrollable footer={<Button variant="soft" icon={PlusIcon} label={t('booking.addPeople')} onPress={onAdd} />}>
      {participants.map((p) => (
        <View key={p.user.id} className="gap-2 border-b border-line-2 pb-3">
          <PersonRow
            person={roomPerson(p.user)}
            trailing={
              <Pressable accessibilityRole="button" accessibilityLabel={t('booking.removeParticipant')} onPress={() => update(p.user.id, null)} hitSlop={10} className="h-11 w-11 items-center justify-center">
                <Icon icon={XIcon} size={16} color="muted" />
              </Pressable>
            }
          />
          <View className="flex-row gap-2 pl-12">
            <RoleToggle label={t('booking.host')} value={p.isHost} onChange={(isHost) => update(p.user.id, { isHost })} />
            <RoleToggle label={t('booking.prepare')} value={p.isPrepareContent} onChange={(isPrepareContent) => update(p.user.id, { isPrepareContent })} />
          </View>
        </View>
      ))}
    </BottomSheet>
  );
}

function RoleToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      className={cn('min-h-[34px] flex-row items-center gap-1.5 rounded-full px-3 active:opacity-80', value ? 'bg-primary' : 'border border-input-border')}
    >
      {value ? <Icon icon={CheckIcon} size={12} weight="bold" color="on-primary" /> : null}
      <Text weight="semibold" className={cn('text-meta', value ? 'text-on-primary' : 'text-ink-2')}>
        {label}
      </Text>
    </Pressable>
  );
}
