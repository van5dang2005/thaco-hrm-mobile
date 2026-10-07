import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Switch, View } from 'react-native';

import { errorMessage } from '@/core/errors/errorMessage';
import { qk } from '@/core/query/keys';
import { useSessionStore } from '@/core/session/sessionStore';
import { parcelPerson, sameId, type ParcelUser, type PersonOf } from '@/core/session/userTypes';
import { useTheme } from '@/core/theme/ThemeProvider';
import { formatDayMonth, parseServerDate } from '@/core/time/vn';
import { cn } from '@/shared/lib/cn';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Avatar } from '@/shared/ui/Avatar';
import { HeaderBar } from '@/shared/ui/HeaderBar';
import { HeaderPanel } from '@/shared/ui/HeaderPanel';
import { Icon } from '@/shared/ui/Icon';
import { CheckIcon, MagnifyingGlassIcon, PackageIcon, XIcon } from '@/shared/ui/icons';
import { NoteField } from '@/shared/ui/NoteField';
import { PersonRow, type Person } from '@/shared/ui/PersonRow';
import { ListSkeleton } from '@/shared/ui/Skeleton';
import { ErrorState } from '@/shared/ui/StateViews';
import { RoundIcon } from '@/shared/ui/RoundIcon';
import { ScreenShell, useHeaderColors } from '@/shared/ui/ScreenShell';
import { SectionTitle } from '@/shared/ui/SectionTitle';
import { ParcelBadge, StatusBadge } from '@/shared/ui/StatusBadge';
import { Text } from '@/shared/ui/Text';
import { toast } from '@/shared/ui/Toast';
import { UserPicker } from '@/shared/ui/UserPicker';
import { goBack } from '@/shared/lib/navigation';

import { parcelsApi } from '../api';
import { parcelIconTone } from '../components/ParcelCard';
import { delegationAllowsHandover, handoverEligibility, isOpenParcel, senderTitle, type Eligibility } from '../logic';
import type { ParcelDto, RelatedUserSummary } from '../types';

type Role = 'owner' | 'default' | 'detailed';
type Candidate = Person & { role: Role };

const summaryPerson = (u: RelatedUserSummary): Person => ({
  id: u.id,
  name: u.fullName ?? u.username,
  code: u.employeeCode,
  department: u.departmentName,
  avatarUrl: u.avatarUrl,
});

/** Who can collect these parcels: each receiver, then delegates whose delegation is in force. */
function candidatesOf(parcels: ParcelDto[]): Candidate[] {
  const list: Candidate[] = [];
  const push = (c: Candidate) => {
    if (!list.some((x) => sameId(x.id, c.id))) list.push(c);
  };
  parcels.forEach((p) =>
    push({ id: p.receiverId, name: p.receiverFullName, code: p.receiverCode, department: p.departmentName, avatarUrl: p.receiverAvatarUrl, role: 'owner' }),
  );
  parcels.forEach((p) => {
    const d = p.relatedDelegation;
    if (d?.delegator && delegationAllowsHandover(d)) push({ ...summaryPerson(d.delegator), role: d.parcelId ? 'detailed' : 'default' });
  });
  return list;
}

/** "Bàn giao bưu phẩm" (6h): who collects, as what, then hand over one or many parcels (bulk-handover). */
export function HandoverScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { fg, sub } = useHeaderColors();
  const queryClient = useQueryClient();
  const connected = useSessionStore((s) => s.connected.parcel);
  const params = useLocalSearchParams<{ ids?: string }>();
  const [ids, setIds] = useState<string[]>(() => (params.ids ?? '').split(',').filter(Boolean));
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
  const closed = parcels.filter((p) => !isOpenParcel(p.status));
  const owners = [...new Set(parcels.map((p) => p.receiverId))];
  const single = owners.length === 1 ? parcels[0] : null;
  const candidates = candidatesOf(parcels.filter((p) => isOpenParcel(p.status)));

  const results = person ? parcels.map((p) => ({ parcel: p, eligibility: handoverEligibility(p, person.id) })) : [];
  const ineligible = results.filter((r) => r.eligibility.kind === 'none').map((r) => r.parcel);
  const canSubmit = !!person && parcels.length > 0 && parcels.length === ids.length && !ineligible.length && !closed.length;

  const submit = useMutation({
    mutationFn: async () => {
      const body = { userId: person!.id, note: note.trim() || undefined, isSendEmail: sendEmail };
      // One parcel: the single endpoint also records the actual receiver's MSNV (the bulk one does not today).
      if (parcels.length === 1) return [await parcelsApi.handover(parcels[0].id, body)];
      return parcelsApi.bulkHandover({ ...body, parcelIds: parcels.map((p) => p.id) });
    },
    onSuccess: (done) => {
      toast.success(t('reception.handedOver', { count: done.length }));
      void queryClient.invalidateQueries({ queryKey: qk.parcels.root });
      void queryClient.invalidateQueries({ queryKey: qk.delegations.root });
      goBack('/parcels/reception');
    },
    onError: (e) => toast.error(errorMessage(e, t)),
  });

  const remove = (id: string) => setIds((list) => list.filter((x) => !sameId(x, id)));

  const owner = single
    ? { name: single.receiverFullName, code: single.receiverCode, department: single.departmentName, avatarUrl: single.receiverAvatarUrl }
    : null;

  const header = (
    <>
      <HeaderBar title={t('reception.handoverTitle')} />
      {parcels.length ? (
        <HeaderPanel testID="handover-owner" className="mt-2.5 flex-row items-center gap-3 px-3.5 py-3">
          {owner ? (
            <Avatar name={owner.name} uri={owner.avatarUrl} size={44} light />
          ) : (
            <RoundIcon icon={PackageIcon} size={44} tone="onBlue" />
          )}
          <View className="min-w-0 flex-1 gap-0.5">
            <Text numberOfLines={1} style={{ fontSize: 12, lineHeight: 16, color: sub }}>
              {owner ? t('reception.originalReceiver') : t('reception.manyReceivers', { count: owners.length })}
            </Text>
            <Text weight="semibold" numberOfLines={1} style={{ fontSize: 15, lineHeight: 20, color: fg }}>
              {owner ? owner.name : t('reception.parcelsCount', { count: parcels.length })}
            </Text>
            {owner ? (
              <Text mono numberOfLines={1} style={{ fontSize: 11.5, lineHeight: 15, color: sub }}>
                {[owner.code, owner.department].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
          </View>
          <Text mono weight="semibold" style={{ fontSize: 22, lineHeight: 28, color: fg }}>
            {parcels.length}
          </Text>
        </HeaderPanel>
      ) : null}
    </>
  );

  return (
    <ScreenShell
      header={header}
      footer={
        <Button
          testID="handover-submit"
          className="flex-1"
          icon={CheckIcon}
          label={t('reception.submitHandover', { count: parcels.length })}
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
          <Card>
            {parcels.map((p, index) => (
              <View key={p.id} className={cn('flex-row items-center gap-3 px-3.5 py-3', index > 0 && 'border-t border-line-2')}>
                <RoundIcon icon={PackageIcon} size={36} tone={parcelIconTone(p.status)} />
                <View className="min-w-0 flex-1">
                  <Text weight="medium" numberOfLines={1} style={{ fontSize: 14, lineHeight: 19 }}>
                    {senderTitle(p)}
                  </Text>
                  <Text mono numberOfLines={1} className="text-muted" style={{ fontSize: 11.5, lineHeight: 15 }}>
                    {single ? p.trackingNumber : `${p.trackingNumber} · ${p.receiverFullName}`}
                  </Text>
                </View>
                <ParcelBadge status={p.status} short />
                {parcels.length > 1 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('reception.removeParcel', { code: p.trackingNumber })}
                    onPress={() => remove(p.id)}
                    hitSlop={10}
                    className="-mr-1 h-8 w-8 items-center justify-center rounded-full active:bg-line-2"
                  >
                    <Icon icon={XIcon} size={15} weight="bold" color="muted" />
                  </Pressable>
                ) : null}
              </View>
            ))}
          </Card>
          {closed.length ? <Banner tone="danger">{t('errors.PARCEL_LOCKED_TO_CONFIRM')}</Banner> : null}

          <SectionTitle>{t('reception.actualReceiver')}</SectionTitle>
          {person ? (
            <Card selected>
              <PersonRow
                testID="handover-person"
                person={person}
                size={42}
                strong
                onPress={() => setPerson(null)}
                className="px-3.5 py-3"
                trailing={
                  <Text weight="semibold" className="text-primary" style={{ fontSize: 13, lineHeight: 17 }}>
                    {t('common.change')}
                  </Text>
                }
              />
            </Card>
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
                  trailing={
                    <StatusBadge
                      kind={c.role === 'owner' ? 'off' : 'ok'}
                      label={t(c.role === 'owner' ? 'reception.roleOwner' : c.role === 'default' ? 'reception.roleDefault' : 'reception.roleDetailed')}
                    />
                  }
                />
              ))}
              <Pressable
                testID="handover-search"
                accessibilityRole="button"
                onPress={() => setPicking(true)}
                className="min-h-[48px] flex-row items-center gap-2 border-t border-line-2 px-3.5 active:bg-line-2"
              >
                <Icon icon={MagnifyingGlassIcon} size={16} weight="bold" color="primary" />
                <Text weight="semibold" className="text-sub text-primary">
                  {t('reception.searchOther')}
                </Text>
              </Pressable>
            </Card>
          )}
          {person ? <EligibilityBox person={person} results={results} ineligible={ineligible} /> : null}

          <Card>
            <NoteField testID="handover-note" variant="row" multiline={false} placeholder={t('reception.notePlaceholder')} value={note} onChangeText={setNote} />
            <View className="h-[52px] flex-row items-center justify-between gap-3 border-t border-line-2 px-3.5">
              <Text numberOfLines={1} className="flex-shrink" style={{ fontSize: 14, lineHeight: 19 }}>
                {t('reception.sendEmail')}
              </Text>
              <Switch
                testID="handover-email"
                value={sendEmail}
                onValueChange={setSendEmail}
                trackColor={{ true: colors.success, false: colors.track }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={colors.track}
                accessibilityLabel={t('reception.sendEmail')}
              />
            </View>
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
    </ScreenShell>
  );
}

type Result = { parcel: ParcelDto; eligibility: Eligibility };

/** "Tư cách nhận" box of 3m: success when every parcel can be collected, danger (and a locked button) otherwise. */
function EligibilityBox({ person, results, ineligible }: { person: Person; results: Result[]; ineligible: ParcelDto[] }) {
  const { t } = useTranslation();
  const text = 'text-sub leading-[19px]';

  if (ineligible.length) {
    return (
      <Banner tone="danger" testID="handover-eligibility">
        {ineligible.length === results.length ? t('reception.notEligible') : t('reception.notEligibleSome', { list: ineligible.map((p) => p.trackingNumber).join(', ') })}
      </Banner>
    );
  }

  // One line per distinct way of collecting (directly, or through a given owner's delegation).
  const lines = new Map<string, string[]>();
  results.forEach(({ parcel, eligibility: e }) => {
    let key: string;
    let parts: string[];
    if (e.kind === 'direct') {
      key = 'direct';
      parts = [t('reception.asDirect'), `${person.name} ${t('reception.asDirectText')}`];
    } else if (e.kind === 'default') {
      key = `default:${e.delegation.id}`;
      const from = formatDayMonth(parseServerDate(e.delegation.startDate));
      const to = formatDayMonth(parseServerDate(e.delegation.endDate));
      parts = [t('reception.asDefault'), t('reception.asDefaultText', { owner: parcel.receiverFullName, from, to })];
    } else if (e.kind === 'detailed') {
      key = `detailed:${parcel.receiverId}`;
      parts = [t('reception.asDetailed'), t('reception.asDetailedText', { owner: parcel.receiverFullName })];
    } else {
      return;
    }
    if (!lines.has(key)) lines.set(key, parts);
  });

  return (
    <Banner tone="success" testID="handover-eligibility">
      <View className="gap-1">
        {[...lines.values()].map(([title, rest]) => (
          <Text key={title + rest} className={cn(text, 'text-success-deep')}>
            <Text weight="bold" className={cn(text, 'text-success-deep')}>
              {title}
            </Text>
            {` ${rest}`}
          </Text>
        ))}
        {results.length > 1 ? <Text className={cn(text, 'text-success-deep')}>{t('reception.allEligible', { count: results.length })}</Text> : null}
      </View>
    </Banner>
  );
}
