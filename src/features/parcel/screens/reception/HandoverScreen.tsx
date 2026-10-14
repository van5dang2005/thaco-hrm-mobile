import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { errorMessage } from '@/core/errors/errorMessage';
import { qk } from '@/core/query/keys';
import { useSessionStore } from '@/core/session/sessionStore';
import { useParcelMe } from '@/core/session/useMe';
import { parcelPerson, sameId, type ParcelUser, type PersonOf } from '@/core/session/userTypes';
import { useTheme } from '@/core/theme/ThemeProvider';
import { cn } from '@/shared/lib/cn';
import { goBack } from '@/shared/lib/navigation';
import { Avatar } from '@/shared/ui/Avatar';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { Card, FloatingCard } from '@/shared/ui/Card';
import { Icon } from '@/shared/ui/Icon';
import { CheckIcon, HandshakeIcon, MailIcon, PackageIcon, SearchIcon } from '@/shared/ui/icons';
import { ModuleHeader } from '@/shared/ui/ModuleHeader';
import { ModuleScreen } from '@/shared/ui/ModuleScreen';
import { NoteField } from '@/shared/ui/NoteField';
import { PersonRow, type Person } from '@/shared/ui/PersonRow';
import { RoundIcon } from '@/shared/ui/RoundIcon';
import { onBlue, useHeaderColors } from '@/shared/ui/ScreenShell';
import { Eyebrow } from '@/shared/ui/SectionTitle';
import { ListSkeleton } from '@/shared/ui/Skeleton';
import { ErrorState } from '@/shared/ui/StateViews';
import { ParcelBadge, StatusBadge } from '@/shared/ui/StatusBadge';
import { SwitchRow } from '@/shared/ui/SwitchRow';
import { Text } from '@/shared/ui/Text';
import { toast } from '@/shared/ui/Toast';
import { UserPicker } from '@/shared/ui/UserPicker';

import { parcelsApi } from '../../api/parcel.api';
import { parcelIconTone } from '../../components/ParcelCard';
import type { ParcelDto } from '../../types';
import { isOpenParcel, senderTitle } from '../../utils/parcel';

/** Who can collect these parcels: each receiver. */
function candidatesOf(parcels: ParcelDto[]): Person[] {
  const list: Person[] = [];
  parcels.forEach((p) => {
    if (list.some((x) => sameId(x.id, p.receiverId))) return;
    list.push({ id: p.receiverId, name: p.receiverFullName, code: p.receiverCode, department: p.departmentName, avatarUrl: p.receiverAvatarUrl });
  });
  return list;
}

/** "Bàn giao bưu phẩm" (6h): who collects, then hand over one or many parcels (bulk-handover). Only the receiver may collect. */
export function HandoverScreen() {
  const { t } = useTranslation();
  const { fg, text2 } = useHeaderColors();
  const queryClient = useQueryClient();
  const connected = useSessionStore((s) => s.connected.parcel);
  const me = useParcelMe();
  const params = useLocalSearchParams<{ ids?: string }>();
  const [ids] = useState<string[]>(() => (params.ids ?? '').split(',').filter(Boolean));
  const [excluded, setExcluded] = useState<string[]>([]);
  const [person, setPerson] = useState<Person | null>(null);
  const [note, setNote] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [picking, setPicking] = useState(false);

  const details = useQueries({
    queries: ids.map((id) => ({ queryKey: qk.parcels.detail(id), queryFn: () => parcelsApi.detail(id), enabled: connected })),
  });
  const loading = details.some((q) => q.isLoading);
  const failed = details.find((q) => q.isError);
  const parcels = details.map((q) => q.data).filter((p): p is ParcelDto => !!p);
  const isChecked = (p: ParcelDto) => !excluded.some((x) => sameId(x, p.id));
  const chosen = parcels.filter(isChecked);
  const closed = chosen.filter((p) => !isOpenParcel(p.status));
  const owners = [...new Set(parcels.map((p) => p.receiverId))];
  const single = owners.length === 1 ? parcels[0] : null;
  const candidates = candidatesOf(chosen.filter((p) => isOpenParcel(p.status)));

  const ineligible = person ? chosen.filter((p) => !sameId(p.receiverId, person.id)) : [];
  const canSubmit = !!person && chosen.length > 0 && parcels.length === ids.length && !ineligible.length && !closed.length;

  const submit = useMutation({
    mutationFn: async () => {
      const body = { userId: person!.id, note: note.trim() || undefined, isSendEmail: sendEmail };
      // One parcel: the single endpoint also records the actual receiver's MSNV (the bulk one does not today).
      if (chosen.length === 1) return [await parcelsApi.handover(chosen[0].id, body)];
      return parcelsApi.bulkHandover({ ...body, parcelIds: chosen.map((p) => p.id) });
    },
    onSuccess: (done) => {
      toast.success(t('reception.handedOver', { count: done.length }));
      void queryClient.invalidateQueries({ queryKey: qk.parcels.root });
      goBack('/parcels/reception');
    },
    onError: (e) => toast.error(errorMessage(e, t)),
  });

  const toggle = (id: string) => setExcluded((list) => (list.some((x) => sameId(x, id)) ? list.filter((x) => !sameId(x, id)) : [...list, id]));

  const owner = single
    ? { name: single.receiverFullName, code: single.receiverCode, department: single.departmentName, avatarUrl: single.receiverAvatarUrl }
    : null;
  const ready = !loading && !failed && parcels.length > 0;

  const header = (
    <ModuleHeader
      testID="handover-header"
      icon={HandshakeIcon}
      title={t('reception.handoverTitle')}
      subtitle={me.data?.fullname ? t('reception.deskOf', { name: me.data.fullname }) : undefined}
      bottom={ready ? 18 : 24}
    >
      {ready ? (
        <View testID="handover-owner" className="flex-row items-center gap-3 rounded-[16px] p-3" style={{ backgroundColor: onBlue(0.12) }}>
          {owner ? <Avatar name={owner.name} uri={owner.avatarUrl} size={46} light /> : <RoundIcon icon={PackageIcon} size={46} tone="onBlue" />}
          <View className="min-w-0 flex-1 gap-0.5">
            <Text numberOfLines={1} style={{ fontSize: 11, lineHeight: 14, color: text2 }}>
              {owner ? t('reception.originalReceiver') : t('reception.manyReceivers', { count: owners.length })}
            </Text>
            <Text weight="bold" numberOfLines={1} style={{ fontSize: 15, lineHeight: 20, color: fg }}>
              {owner ? owner.name : t('reception.parcelsCount', { count: parcels.length })}
            </Text>
            {owner ? (
              <Text mono numberOfLines={1} style={{ fontSize: 11, lineHeight: 15, color: text2 }}>
                {[owner.code, owner.department].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
          </View>
          <View className="items-end">
            <Text mono weight="bold" style={{ fontSize: 24, lineHeight: 30, color: fg }}>
              {String(chosen.length)}
            </Text>
            <Text numberOfLines={1} style={{ fontSize: 10.5, lineHeight: 13, color: text2 }}>
              {t('reception.parcelsUnit')}
            </Text>
          </View>
        </View>
      ) : null}
    </ModuleHeader>
  );

  const list = ready ? (
    <FloatingCard radius={20} className="px-3.5 py-1.5" testID="handover-parcels">
      {parcels.map((p, index) => {
        const checked = isChecked(p);
        const row = (
          <>
            {parcels.length > 1 ? (
              <View className={cn('h-5 w-5 items-center justify-center rounded-[6px]', checked ? 'bg-primary' : 'border-2 border-line-strong')}>
                {checked ? <Icon icon={CheckIcon} size={12} weight="bold" color="on-primary" /> : null}
              </View>
            ) : null}
            <RoundIcon icon={PackageIcon} size={36} square tone={parcelIconTone(p.status)} />
            <View className="min-w-0 flex-1">
              <Text weight="semibold" numberOfLines={1} style={{ fontSize: 13.5, lineHeight: 18 }}>
                {senderTitle(p)}
              </Text>
              <Text mono numberOfLines={1} className="text-muted" style={{ fontSize: 11, lineHeight: 15 }}>
                {single ? p.trackingNumber : `${p.trackingNumber} · ${p.receiverFullName}`}
              </Text>
            </View>
            <ParcelBadge status={p.status} short />
          </>
        );
        const box = cn('flex-row items-center gap-3 py-2.5', index > 0 && 'border-t border-line-2', !checked && 'opacity-50');
        return parcels.length > 1 ? (
          <Pressable
            key={p.id}
            testID={`handover-check-${p.trackingNumber}`}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            accessibilityLabel={`${senderTitle(p)} · ${p.trackingNumber}`}
            onPress={() => toggle(p.id)}
            className={cn(box, 'active:opacity-70')}
          >
            {row}
          </Pressable>
        ) : (
          <View key={p.id} className={box}>
            {row}
          </View>
        );
      })}
    </FloatingCard>
  ) : null;

  return (
    <ModuleScreen
      header={header}
      floating={list}
      floatingScrolls
      footer={
        <Button
          testID="handover-submit"
          className="flex-1"
          icon={CheckIcon}
          label={t('reception.submitHandover', { count: chosen.length })}
          disabled={!canSubmit}
          loading={submit.isPending}
          onPress={() => submit.mutate()}
        />
      }
    >
      {loading ? (
        <ListSkeleton count={2} />
      ) : failed ? (
        <ErrorState error={failed.error} onRetry={() => details.forEach((q) => void q.refetch())} />
      ) : (
        <>
          {closed.length ? <Banner tone="danger">{t('errors.PARCEL_LOCKED_TO_CONFIRM')}</Banner> : null}

          <View className="flex-row items-center justify-between gap-2 px-1 pt-1">
            <Eyebrow>{t('reception.actualReceiver')}</Eyebrow>
            {person ? (
              <Pressable testID="handover-change-person" accessibilityRole="button" hitSlop={10} onPress={() => setPerson(null)} className="active:opacity-70">
                <Text weight="semibold" className="text-primary" style={{ fontSize: 12.5, lineHeight: 17 }}>
                  {t('reception.changePerson')}
                </Text>
              </Pressable>
            ) : null}
          </View>
          {person ? (
            <ReceiverCard person={person} total={chosen.length} ineligible={ineligible} />
          ) : (
            <Card>
              <Text className="px-3.5 pt-3 text-muted" style={{ fontSize: 12, lineHeight: 16 }}>
                {t('reception.suggestions')}
              </Text>
              {candidates.map((c, index) => (
                <PersonRow
                  key={c.id}
                  testID={`handover-candidate-${index}`}
                  person={c}
                  size={40}
                  onPress={() => setPerson(c)}
                  className={cn('min-h-[56px] px-3.5 py-2.5', index > 0 && 'border-t border-line-2')}
                  trailing={<StatusBadge kind="off" label={t('reception.roleOwner')} />}
                />
              ))}
              <Pressable
                testID="handover-search"
                accessibilityRole="button"
                onPress={() => setPicking(true)}
                className="min-h-[48px] flex-row items-center gap-2 border-t border-line-2 px-3.5 active:bg-line-2"
              >
                <Icon icon={SearchIcon} size={16} weight="bold" color="primary" />
                <Text weight="semibold" className="text-sub text-primary">
                  {t('reception.searchOther')}
                </Text>
              </Pressable>
            </Card>
          )}

          <Card className="gap-2.5 px-3.5 py-3">
            <NoteField testID="handover-note" placeholder={t('reception.notePlaceholder')} value={note} onChangeText={setNote} />
            <SwitchRow testID="handover-email" icon={MailIcon} label={t('reception.sendEmail')} value={sendEmail} onChange={setSendEmail} />
          </Card>
        </>
      )}

      <UserPicker<PersonOf<ParcelUser>>
        testID="handover-picker"
        visible={picking}
        onClose={() => setPicking(false)}
        title={t('reception.chooseReceiver')}
        cacheKey="parcel"
        search={async (keyword) => (await parcelsApi.searchUsers(keyword)).items.map(parcelPerson)}
        onSelect={setPerson}
      />
    </ModuleScreen>
  );
}

/**
 * Chosen receiver (6h): person row, then the "tư cách nhận" box inside the same card. Green ring when
 * the person is the receiver of every chosen parcel; red ring, red box and a locked submit button otherwise.
 */
function ReceiverCard({ person, total, ineligible }: { person: Person; total: number; ineligible: ParcelDto[] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const text = 'text-sub leading-[19px]';
  const blocked = ineligible.length > 0;

  return (
    <Card className="gap-3 p-3.5" style={{ borderWidth: 1.5, borderColor: blocked ? colors['danger-border'] : colors['success-border'] }}>
      <PersonRow testID="handover-person" person={person} size={44} strong />
      {blocked ? (
        <Banner tone="danger" className="rounded-[12px] px-3 py-2.5" testID="handover-eligibility">
          {ineligible.length === total ? t('reception.notEligible') : t('reception.notEligibleSome', { list: ineligible.map((p) => p.trackingNumber).join(', ') })}
        </Banner>
      ) : (
        <Banner tone="success" className="rounded-[12px] px-3 py-2.5" testID="handover-eligibility">
          <View className="gap-1">
            <Text className={cn(text, 'text-success-deep')}>
              <Text weight="bold" className={cn(text, 'text-success-deep')}>
                {t('reception.asDirect')}
              </Text>
              {` ${person.name} ${t('reception.asDirectText')}`}
            </Text>
            {total > 1 ? <Text className={cn(text, 'text-success-deep')}>{t('reception.allEligible', { count: total })}</Text> : null}
          </View>
        </Banner>
      )}
    </Card>
  );
}
