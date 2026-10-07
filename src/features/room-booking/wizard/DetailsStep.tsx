import * as DocumentPicker from 'expo-document-picker';
import { Redirect, router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, Switch, TextInput, View } from 'react-native';
import { z } from 'zod';

import { useRoomMe } from '@/core/session/useMe';
import { roomPerson, sameId, type PersonOf, type RoomUser } from '@/core/session/userTypes';
import { MAX_FONT_SCALE } from '@/core/theme/fonts';
import { useFontStyle } from '@/core/theme/fontStore';
import { useTheme } from '@/core/theme/ThemeProvider';
import { cn } from '@/shared/lib/cn';
import { Avatar } from '@/shared/ui/Avatar';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { CheckIcon, DoorOpenIcon, LinkSimpleIcon, LockIcon, PlusIcon, XIcon } from '@/shared/ui/icons';
import { PersonRow } from '@/shared/ui/PersonRow';
import { RoundIcon } from '@/shared/ui/RoundIcon';
import { onBlue, ScreenShell } from '@/shared/ui/ScreenShell';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';
import { toast } from '@/shared/ui/Toast';
import { UserPicker } from '@/shared/ui/UserPicker';

import { roomsApi } from '../api';
import { useBookingDraft, type DraftParticipant } from '../draftStore';
import { useRooms } from '../hooks';
import { MAX_DOCUMENT_BYTES, MAX_DOCUMENTS } from '../logic';
import { WizardHeader } from '../ui/WizardHeader';
import { serviceIcon } from '../ui/serviceIcon';
import { useDraftLabels } from '../wizardData';
import { useGoToStep } from './navigation';

const detailsSchema = z.object({
  content: z.string().trim().min(1, 'booking.requiredContent').max(500),
  links: z.array(z.string().regex(/^https?:\/\/\S+$/i, 'booking.invalidLink')),
});

const linkSchema = z.string().trim().regex(/^https?:\/\/\S+$/i);

const AVATARS = 4;

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

  if (!draft.roomId) return <Redirect href="/rooms/book" />;

  const participants = draft.participants;
  const host = participants.find((p) => p.isHost);
  const documentCount = draft.keptAttachments.length + draft.files.length + draft.links.length;
  const phone = draft.phone || me.data?.phoneNumber || '';
  const services = (room?.services ?? []).filter((s) => s.isActive !== false);
  const fg = colors['header-name'];

  const onPickPeople = (picked: PersonOf<RoomUser>[]) => {
    const existing = new Map(participants.map((p) => [p.user.id.toLowerCase(), p]));
    patch({ participants: picked.map((p) => existing.get(p.id.toLowerCase()) ?? { user: p.user, isHost: false, isPrepareContent: false }) });
  };

  const pickFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
    if (result.canceled) return;
    const slots = MAX_DOCUMENTS - documentCount;
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

  const addDocument = () =>
    Alert.alert(t('booking.addDocument'), undefined, [
      { text: t('booking.addFileOption'), onPress: () => void pickFiles() },
      { text: t('booking.addLinkOption'), onPress: () => setLinkInput('') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);

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
    const parsed = detailsSchema.safeParse({ content: draft.content, links: draft.links });
    if (!parsed.success) {
      setError(t(parsed.error.issues[0].message as 'booking.requiredContent'));
      return;
    }
    setError(null);
    if (!draft.phone && phone) patch({ phone });
    router.push('/rooms/book/confirm');
  };

  const header = (
    <>
      <WizardHeader testID="booking-details-header" title={t('booking.detailsTitle')} step={3} />
      <View className="mx-3 mt-2.5 flex-row items-center gap-3 rounded-[16px] px-3.5 py-3" style={{ backgroundColor: onBlue(0.12) }}>
        <RoundIcon icon={DoorOpenIcon} size={40} tone="onBlue" />
        <View className="min-w-0 flex-1 gap-0.5">
          <Text weight="semibold" numberOfLines={1} className="text-body" style={{ color: fg }}>
            {room?.name ?? ''}
          </Text>
          <Text numberOfLines={2} className="text-meta" style={{ color: colors['header-job'] }}>
            <Text mono className="text-meta" style={{ color: colors['header-job'] }}>
              {labels.time}
            </Text>
            {` · ${labels.dayShort}${labels.repeat ? ` · ${labels.repeat}` : ''}`}
          </Text>
        </View>
        <Pressable testID="booking-details-edit-time" accessibilityRole="button" accessibilityLabel={t('booking.backToTime')} onPress={() => goToStep('time')} hitSlop={12} className="min-h-[44px] justify-center">
          <Text weight="semibold" className="text-sub" style={{ color: fg }}>
            {t('booking.edit')}
          </Text>
        </Pressable>
      </View>
    </>
  );

  const footer = (
    <View className="flex-1 gap-3">
      {error ? (
        <Banner tone="danger" testID="booking-details-error">
          {error}
        </Banner>
      ) : null}
      <Button testID="booking-content-continue" label={t('booking.review')} onPress={review} />
    </View>
  );

  return (
    <ScreenShell header={header} footer={footer} slide sheetBg="surface" scroll={false}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-5 px-4 pb-6 pt-[22px]">
        <Section title={t('booking.contentLabel')}>
          <TextInput
            testID="booking-content"
            value={draft.content}
            onChangeText={(content) => {
              setError(null);
              patch({ content });
            }}
            placeholder={t('booking.contentPlaceholder')}
            placeholderTextColor={colors.subtle}
            multiline
            maxLength={500}
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            textAlignVertical="top"
            accessibilityLabel={t('booking.contentLabel')}
            className="min-h-[72px] rounded-[16px] bg-field px-3.5 py-3"
            style={{ fontSize: 14, lineHeight: 21, color: colors.ink, ...inputFont }}
          />
          <View className="min-h-[44px] flex-row items-center gap-2">
            <Icon icon={LockIcon} size={16} color="ink-2" />
            <Text className="flex-1 text-sub text-ink-2">{t('booking.confidential')}</Text>
            <Switch
              testID="booking-confidential"
              value={draft.confidential}
              onValueChange={(confidential) => patch({ confidential })}
              trackColor={{ true: colors.primary, false: colors.track }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={colors.track}
              accessibilityLabel={t('booking.confidential')}
            />
          </View>
        </Section>

        <Section
          title={t('booking.participantsTitle', { count: participants.length })}
          right={
            <Text weight="semibold" numberOfLines={1} className={cn('flex-shrink text-sub', host ? 'text-primary' : 'text-subtle')}>
              {host ? t('booking.hostIs', { name: host.user.fullname ?? '' }) : t('booking.noHost')}
            </Text>
          }
        >
          <View className="flex-row items-center">
            <Pressable
              testID="booking-add-participant"
              accessibilityRole="button"
              accessibilityLabel={t('booking.addPeople')}
              onPress={() => setPicker(true)}
              className="mr-2.5 h-[38px] w-[38px] items-center justify-center rounded-full border-[1.5px] border-dashed border-primary active:opacity-70"
              hitSlop={4}
            >
              <Icon icon={PlusIcon} size={18} color="primary" />
            </Pressable>
            {participants.length ? (
              <Pressable
                testID="booking-participants"
                accessibilityRole="button"
                accessibilityLabel={`${t('booking.participantsSheet')}: ${participants.map((p) => p.user.fullname).join(', ')}`}
                onPress={() => setPeople(true)}
                className="min-h-[44px] flex-row items-center active:opacity-80"
              >
                {participants.slice(0, participants.length > AVATARS ? AVATARS - 1 : AVATARS).map((p, i) => (
                  <View key={p.user.id} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                    <Avatar name={p.user.fullname} uri={p.user.avatarUrl} size={38} ring />
                  </View>
                ))}
                {participants.length > AVATARS ? (
                  <View className="h-[38px] w-[38px] items-center justify-center rounded-full border-2 border-surface bg-inverse" style={{ marginLeft: -8 }}>
                    <Text weight="semibold" className="text-meta text-on-inverse">{`+${participants.length - (AVATARS - 1)}`}</Text>
                  </View>
                ) : null}
              </Pressable>
            ) : (
              <Text className="flex-1 text-sub text-muted">{t('booking.addPeople')}</Text>
            )}
          </View>
        </Section>

        <Section title={t('booking.services')}>
          {services.length ? (
            <View className="gap-3">
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
                        className="flex-1 items-center gap-[7px] active:opacity-70"
                      >
                        <RoundIcon icon={serviceIcon(service.name)} size={54} tone={selected ? 'solid' : 'brand'}>
                          {selected ? (
                            <View className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-surface p-0.5">
                              <View className="flex-1 items-center justify-center rounded-full bg-success">
                                <Icon icon={CheckIcon} size={10} weight="bold" rawColor="#FFFFFF" />
                              </View>
                            </View>
                          ) : null}
                        </RoundIcon>
                        <Text weight="medium" numberOfLines={2} className="text-center text-meta">
                          {service.name}
                        </Text>
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
        </Section>

        <Section title={t('booking.documents')} right={<Text className="text-meta text-subtle">{t('booking.documentsLimit', { count: documentCount })}</Text>}>
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
            {documentCount < MAX_DOCUMENTS ? (
              <Pressable
                testID="booking-add-document"
                accessibilityRole="button"
                accessibilityLabel={t('booking.addDocument')}
                onPress={addDocument}
                className="h-11 w-11 items-center justify-center rounded-[12px] border-[1.5px] border-dashed border-line-strong active:opacity-70"
              >
                <Icon icon={PlusIcon} size={18} color="muted" />
              </Pressable>
            ) : null}
          </View>
        </Section>

        <Section title={t('booking.moreInfo')}>
          <TextField
            appearance="ios"
            label={t('booking.otherParticipants')}
            placeholder={t('booking.otherParticipantsPlaceholder')}
            value={draft.participantText}
            onChangeText={(participantText) => patch({ participantText })}
          />
          <TextField appearance="ios" label={t('booking.phone')} keyboardType="phone-pad" value={draft.phone || phone} onChangeText={(value) => patch({ phone: value })} maxLength={20} />
        </Section>
      </ScrollView>

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
    </ScreenShell>
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

function Section({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <View className="gap-2.5">
      <View className="flex-row items-baseline justify-between gap-3">
        <Text weight="semibold" accessibilityRole="header" numberOfLines={1} className="flex-shrink text-card">
          {title}
        </Text>
        {right}
      </View>
      {children}
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
        <Icon icon={LinkSimpleIcon} size={16} color="primary" />
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
