import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, RefreshControl } from 'react-native';

import { errorMessage } from '@/core/errors/errorMessage';
import { qk } from '@/core/query/keys';
import { useParcelMe } from '@/core/session/useMe';
import { parcelPerson, sameId, type ParcelUser, type PersonOf } from '@/core/session/userTypes';
import { addDays, atMinutes, parseServerDate, todayKey, toDateKey, type DateKey } from '@/core/time/vn';
import { parcelsApi, delegationsApi } from '@/features/parcel/api';
import { useMyDelegations } from '@/features/parcel/hooks';
import { isOpenParcel } from '@/features/parcel/logic';
import { DelegationStatus, DelegationType, MatchReason, type DelegationDto } from '@/features/parcel/types';
import { Button } from '@/shared/ui/Button';
import { DatePickerSheet } from '@/shared/ui/DatePickerSheet';
import { HeaderIconButton } from '@/shared/ui/HeaderBar';
import { HeaderSegmented } from '@/shared/ui/HeaderSegmented';
import { CheckIcon, InboxIcon, PlusIcon, SendIcon, TrashIcon, UsersIcon, UserCheckIcon, XIcon } from '@/shared/ui/icons';
import { ModuleHeader } from '@/shared/ui/ModuleHeader';
import { ModuleScreen } from '@/shared/ui/ModuleScreen';
import { ListSkeleton } from '@/shared/ui/Skeleton';
import { EmptyState, ErrorState } from '@/shared/ui/StateViews';
import { toast } from '@/shared/ui/Toast';
import { UserPicker } from '@/shared/ui/UserPicker';

import { DelegationCard, DelegationRow } from './DelegationCard';

type Tab = 'mine' | 'toMe';

/** End of a Vietnam day, used for delegation end dates. */
const endOfDay = (key: DateKey) => atMinutes(key, 23 * 60 + 59).toISOString();

const order: Record<number, number> = {
  [DelegationStatus.Waiting]: 0,
  [DelegationStatus.DueSoon]: 1,
  [DelegationStatus.Active]: 2,
  [DelegationStatus.Rejected]: 3,
  [DelegationStatus.Expired]: 4,
};

export function DelegationsScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const me = useParcelMe();
  const delegations = useMyDelegations();
  const [tab, setTab] = useState<Tab>('mine');
  const [renewing, setRenewing] = useState<DelegationDto | null>(null);
  const [ending, setEnding] = useState<DelegationDto | null>(null);
  const [changing, setChanging] = useState<DelegationDto | null>(null);

  // All my parcels (any status) to describe per-parcel delegations and count waiting ones.
  const myParcels = useQuery({
    queryKey: qk.parcels.my({ all: true }),
    queryFn: () => parcelsApi.my({ pageNumber: 1, pageSize: 200 }),
    enabled: !!me.data,
    select: (page) => page.items,
  });

  const all = delegations.data ?? [];
  const mine = all.filter((d) => sameId(d.authorizerId, me.data?.id)).sort((a, b) => order[a.status] - order[b.status]);
  const toMe = all.filter((d) => sameId(d.delegatorId, me.data?.id)).sort((a, b) => order[a.status] - order[b.status]);
  const awaitingMe = toMe.filter((d) => d.status === DelegationStatus.Waiting).length;
  const inForce = (list: DelegationDto[]) => list.filter((d) => d.status === DelegationStatus.Active || d.status === DelegationStatus.DueSoon).length;
  const list = tab === 'mine' ? mine : toMe;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: qk.delegations.root });
    void queryClient.invalidateQueries({ queryKey: qk.parcels.root });
  };
  const onError = (e: unknown) => toast.error(errorMessage(e, t));

  const accept = useMutation({ mutationFn: (id: string) => delegationsApi.accept(id), onSuccess: () => {
      toast.success(t('delegations.accepted'));
      refresh();
    }, onError });
  const reject = useMutation({ mutationFn: (id: string) => delegationsApi.reject(id), onSuccess: () => {
      toast.success(t('delegations.declined'));
      refresh();
    }, onError });
  const remove = useMutation({ mutationFn: (id: string) => delegationsApi.remove(id), onSuccess: () => {
      toast.success(t('delegations.removed'));
      refresh();
    }, onError });
  const renew = useMutation({
    mutationFn: ({ id, key }: { id: string; key: DateKey }) => delegationsApi.renew(id, endOfDay(key)),
    onSuccess: (result) => {
      toast.success(result?.status === DelegationStatus.Waiting ? t('delegations.renewPending') : t('delegations.renewed'));
      refresh();
    },
    onError,
  });
  const terminate = useMutation({
    // Today means "end now" so the delegation expires immediately.
    mutationFn: ({ id, key }: { id: string; key: DateKey }) => delegationsApi.terminate(id, key === todayKey() ? new Date().toISOString() : endOfDay(key)),
    onSuccess: () => {
      toast.success(t('delegations.ended'));
      refresh();
    },
    onError,
  });
  const change = useMutation({
    mutationFn: ({ d, user }: { d: DelegationDto; user: ParcelUser }) =>
      delegationsApi.edit({ id: d.id, delegatorId: user.id, parcelId: d.parcelId ?? null, startDate: d.startDate ?? null, endDate: d.endDate ?? null }),
    onSuccess: () => {
      toast.success(t('delegations.changed'));
      refresh();
    },
    onError,
  });

  const parcelFor = (d: DelegationDto) => myParcels.data?.find((p) => sameId(p.id, d.parcelId)) ?? null;
  const waitingFor = (d: DelegationDto) =>
    (myParcels.data ?? []).filter((p) => p.matchReason === MatchReason.DefaultDelegation && sameId(p.delegatorCode, d.authorizerCode) && isOpenParcel(p.status)).length;

  const confirm = (title: string, message: string, onOk: () => void, destructive = false) =>
    Alert.alert(title, message, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: title, style: destructive ? 'destructive' : 'default', onPress: onOk },
    ]);

  const actionsFor = (d: DelegationDto) => {
    const isDefault = d.appliedType === DelegationType.Default;
    const buttons = [];
    if (tab === 'toMe') {
      if (d.status === DelegationStatus.Waiting) {
        buttons.push(
          <Button key="decline" testID={`delegation-decline-${d.id}`} className="flex-1" size="sm" variant="danger-soft" icon={XIcon} label={t('delegations.decline')} loading={reject.isPending} onPress={() => confirm(t('delegations.decline'), t('delegations.declineConfirm'), () => reject.mutate(d.id), true)} />,
          <Button key="accept" testID={`delegation-accept-${d.id}`} className="flex-[1.4]" size="sm" icon={CheckIcon} label={t('delegations.accept')} loading={accept.isPending} onPress={() => accept.mutate(d.id)} />,
        );
      }
      return buttons;
    }
    const editable = (d.status === DelegationStatus.Waiting && !d.pendingEndDate) || d.status === DelegationStatus.Rejected;
    if (isDefault && (d.status === DelegationStatus.Active || d.status === DelegationStatus.DueSoon)) {
      buttons.push(
        <Button key="end" testID={`delegation-end-${d.id}`} className="flex-1" size="sm" variant="neutral" label={t('delegations.endEarly')} onPress={() => setEnding(d)} />,
        <Button key="renew" testID={`delegation-renew-${d.id}`} className="flex-1" size="sm" label={t('delegations.renew')} onPress={() => setRenewing(d)} />,
      );
    } else {
      buttons.push(
        <Button key="remove" testID={`delegation-remove-${d.id}`} className="flex-1" size="sm" variant="danger-soft" icon={TrashIcon} label={t('delegations.remove')} onPress={() => confirm(t('delegations.remove'), t('delegations.removeConfirm'), () => remove.mutate(d.id), true)} />,
      );
      if (editable) buttons.push(<Button key="change" className="flex-1" size="sm" variant="ghost" label={t('delegations.changePerson')} onPress={() => setChanging(d)} />);
    }
    return buttons;
  };

  const create = () => router.push('/parcels/delegations/new');
  // Cards start on the blue (6f / 6g); empty, loading and error states sit below it.
  const overlap = !delegations.isLoading && !delegations.isError && list.length > 0;
  const header = (
    <ModuleHeader
      testID="delegations-header"
      icon={UserCheckIcon}
      title={t('delegations.title')}
      right={<HeaderIconButton testID="delegations-create" variant="solid" icon={PlusIcon} label={t('delegations.create')} onPress={create} />}
      bottom={overlap ? 18 : 24}
    >
      <HeaderSegmented
        testID="delegations-tabs"
        className=""
        size="lg"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'mine', label: t('delegations.mine'), sublabel: t('delegations.inForce', { count: inForce(mine) }), icon: SendIcon, testID: 'delegations-tab-mine' },
          {
            value: 'toMe',
            label: t('delegations.toMe'),
            sublabel: awaitingMe ? t('delegations.awaitingCount', { count: awaitingMe }) : t('delegations.inForce', { count: inForce(toMe) }),
            icon: InboxIcon,
            badge: awaitingMe,
            testID: 'delegations-tab-tome',
          },
        ]}
      />
    </ModuleHeader>
  );

  return (
    <ModuleScreen
      header={header}
      overlap={overlap}
      refreshControl={<RefreshControl refreshing={delegations.isRefetching} onRefresh={() => void Promise.all([delegations.refetch(), myParcels.refetch()])} />}
    >
      {delegations.isLoading ? (
        <ListSkeleton count={3} lines={4} />
      ) : delegations.isError ? (
        <ErrorState error={delegations.error} onRetry={() => void delegations.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          message={tab === 'mine' ? t('delegations.emptyMine') : t('delegations.emptyToMe')}
          actionLabel={tab === 'mine' ? t('delegations.create') : undefined}
          onAction={tab === 'mine' ? create : undefined}
        />
      ) : (
        list.map((d) =>
          d.status === DelegationStatus.Expired ? (
            <DelegationRow key={d.id} delegation={d} side={tab} />
          ) : (
            <DelegationCard
              key={d.id}
              testID={`delegation-${d.id}`}
              delegation={d}
              side={tab}
              parcel={parcelFor(d)}
              waitingCount={tab === 'toMe' ? waitingFor(d) : 0}
              onPressWaiting={() => router.push('/parcels')}
              actions={actionsFor(d).length ? actionsFor(d) : undefined}
            />
          ),
        )
      )}

      <DatePickerSheet
        visible={!!renewing}
        onClose={() => setRenewing(null)}
        title={t('delegations.renewTitle')}
        value={renewing?.endDate ? addDays(toDateKey(parseServerDate(renewing.endDate)!), 7) : undefined}
        minDate={renewing?.endDate ? addDays(toDateKey(parseServerDate(renewing.endDate)!), 1) : todayKey()}
        onSelect={(key) => renewing && renew.mutate({ id: renewing.id, key })}
      />
      <DatePickerSheet
        visible={!!ending}
        onClose={() => setEnding(null)}
        title={t('delegations.endTitle')}
        value={todayKey()}
        minDate={todayKey()}
        maxDate={ending?.endDate ? toDateKey(parseServerDate(ending.endDate)!) : undefined}
        onSelect={(key) => ending && terminate.mutate({ id: ending.id, key })}
      />
      <UserPicker<PersonOf<ParcelUser>>
        visible={!!changing}
        onClose={() => setChanging(null)}
        title={t('delegations.chooseDelegate')}
        cacheKey="parcel"
        excludeIds={[me.data?.id ?? '', changing?.delegatorId ?? '']}
        search={async (keyword) => (await parcelsApi.searchUsers(keyword)).items.map(parcelPerson)}
        onSelect={(person) => changing && change.mutate({ d: changing, user: person.user })}
      />
    </ModuleScreen>
  );
}
