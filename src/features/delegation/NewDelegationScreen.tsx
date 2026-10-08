import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { errorMessage } from '@/core/errors/errorMessage';
import { qk } from '@/core/query/keys';
import { useParcelMe } from '@/core/session/useMe';
import { parcelPerson, sameId, type ParcelUser, type PersonOf } from '@/core/session/userTypes';
import { addDays, atMinutes, formatKey, todayKey, type DateKey } from '@/core/time/vn';
import { FieldBox } from '@/shared/ui/FieldBox';
import { delegationsApi, parcelsApi } from '@/features/parcel/api';
import { useDelegatableParcels, useMyDelegations } from '@/features/parcel/hooks';
import { activeDefaultOf, senderTitle } from '@/features/parcel/logic';
import { DelegationStatus } from '@/features/parcel/types';
import { cn } from '@/shared/lib/cn';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { DatePickerSheet } from '@/shared/ui/DatePickerSheet';
import { HeaderSegmented } from '@/shared/ui/HeaderSegmented';
import { Icon } from '@/shared/ui/Icon';
import { ArrowRightIcon, CheckIcon, UserPlusIcon } from '@/shared/ui/icons';
import { PersonRow } from '@/shared/ui/PersonRow';
import { ModuleHeader } from '@/shared/ui/ModuleHeader';
import { ModuleScreen } from '@/shared/ui/ModuleScreen';
import { ListSkeleton } from '@/shared/ui/Skeleton';
import { ErrorState } from '@/shared/ui/StateViews';
import { ParcelBadge } from '@/shared/ui/StatusBadge';
import { SwitchRow } from '@/shared/ui/SwitchRow';
import { Text } from '@/shared/ui/Text';
import { toast } from '@/shared/ui/Toast';
import { UserPicker } from '@/shared/ui/UserPicker';
import { goBack } from '@/shared/lib/navigation';

type Kind = 'default' | 'detailed';

/** Create a default (by date) or per-parcel delegation ("form tạo ủy quyền từ 3k"). */
export function NewDelegationScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ parcelId?: string }>();
  const me = useParcelMe();
  const delegations = useMyDelegations();
  const [kind, setKind] = useState<Kind>(params.parcelId ? 'detailed' : 'default');
  const [delegate, setDelegate] = useState<PersonOf<ParcelUser> | null>(null);
  const [startKey, setStartKey] = useState<DateKey>(todayKey());
  const [endKey, setEndKey] = useState<DateKey>(addDays(todayKey(), 7));
  const [parcelIds, setParcelIds] = useState<string[]>(params.parcelId ? [params.parcelId] : []);
  const [sendEmail, setSendEmail] = useState(true);
  const [picker, setPicker] = useState<'user' | 'start' | 'end' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const parcels = useDelegatableParcels(kind === 'detailed');
  const blocking = activeDefaultOf(delegations.data ?? [], me.data?.id);

  const submit = useMutation({
    mutationFn: async () => {
      if (!delegate) throw new Error('pick');
      if (kind === 'default') {
        return [
          await delegationsApi.create({
            delegatorId: delegate.id,
            startDate: startKey === todayKey() ? new Date().toISOString() : atMinutes(startKey, 0).toISOString(),
            endDate: atMinutes(endKey, 23 * 60 + 59).toISOString(),
            isSendEmail: sendEmail,
          }),
        ];
      }
      if (parcelIds.length === 1) return [await delegationsApi.create({ delegatorId: delegate.id, parcelId: parcelIds[0], isSendEmail: sendEmail })];
      return delegationsApi.createBulk({ delegatorId: delegate.id, parcelIds, isSendEmail: sendEmail });
    },
    onSuccess: (created) => {
      const waiting = created.some((d) => d.status === DelegationStatus.Waiting);
      toast.success(t('delegations.created'), waiting ? t('status.delegation.5') : undefined);
      void queryClient.invalidateQueries({ queryKey: qk.delegations.root });
      void queryClient.invalidateQueries({ queryKey: qk.parcels.root });
      goBack('/parcels/delegations');
    },
    onError: (e) => setError(errorMessage(e, t)),
  });

  const onSubmit = () => {
    setError(null);
    if (!delegate) return setError(t('delegations.pickDelegate'));
    if (kind === 'detailed' && !parcelIds.length) return setError(t('delegations.pickParcels'));
    if (kind === 'default' && endKey <= startKey) return setError(t('validation.endAfterStart'));
    submit.mutate();
  };

  const detailedBlocked = kind === 'detailed' && !!blocking;

  return (
    <ModuleScreen
      header={
        <ModuleHeader icon={UserPlusIcon} title={t('delegations.newTitle')} bottom={24}>
          <HeaderSegmented<Kind>
            testID="new-delegation-kind"
            className=""
            value={kind}
            onChange={(value) => {
              setKind(value);
              setError(null);
            }}
            options={[
              { value: 'default', label: t('delegations.typeDefault'), testID: 'new-delegation-default' },
              { value: 'detailed', label: t('delegations.typeDetailed'), testID: 'new-delegation-detailed' },
            ]}
          />
        </ModuleHeader>
      }
      footer={<Button testID="new-delegation-submit" className="flex-1" label={t('delegations.submit')} loading={submit.isPending} disabled={detailedBlocked} onPress={onSubmit} />}
    >
        <Text className="px-1 text-meta leading-[17px] text-muted">{kind === 'default' ? t('delegations.defaultHint') : t('delegations.detailedHint')}</Text>

        <Card className="gap-2.5 p-4">
          <Text weight="semibold" className="text-body">
            {t('delegations.delegate')}
          </Text>
          {delegate ? (
            <PersonRow
              person={delegate}
              size={40}
              strong
              onPress={() => setPicker('user')}
              trailing={
                <Text weight="semibold" className="text-sub text-primary">
                  {t('common.change')}
                </Text>
              }
            />
          ) : (
            <Button testID="new-delegation-pick-user" variant="soft" size="lg" label={t('delegations.chooseDelegate')} onPress={() => setPicker('user')} />
          )}
        </Card>

        {kind === 'default' ? (
          <Card className="flex-row items-center gap-2 p-4">
            <FieldBox label={t('delegations.startDate')} value={formatKey(startKey)} onPress={() => setPicker('start')} />
            <Icon icon={ArrowRightIcon} size={16} color="subtle" />
            <FieldBox testID="new-delegation-end" label={t('delegations.endDate')} value={formatKey(endKey)} onPress={() => setPicker('end')} />
          </Card>
        ) : (
          <Card className="gap-1 p-4">
            <Text weight="semibold" className="pb-1 text-body">
              {t('delegations.parcels')}
            </Text>
            {detailedBlocked ? <Banner tone="warning">{t('delegations.blockedByDefault')}</Banner> : null}
            {!detailedBlocked && parcels.isLoading ? <ListSkeleton count={2} lines={2} /> : null}
            {!detailedBlocked && parcels.isError ? <ErrorState compact error={parcels.error} onRetry={() => void parcels.refetch()} /> : null}
            {!detailedBlocked && parcels.isSuccess && !parcels.data.length ? <Text className="py-3 text-sub text-muted">{t('delegations.noParcels')}</Text> : null}
            {(parcels.data ?? []).map((p, index) => {
              const selected = parcelIds.some((id) => sameId(id, p.id));
              return (
                <Pressable
                  key={p.id}
                  testID={`new-delegation-parcel-${index}`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  disabled={detailedBlocked}
                  onPress={() => setParcelIds((ids) => (selected ? ids.filter((id) => !sameId(id, p.id)) : [...ids, p.id]))}
                  className={cn('min-h-[52px] flex-row items-center gap-3 py-2', index > 0 && 'border-t border-line-2', detailedBlocked && 'opacity-50')}
                >
                  <View className={cn('h-[22px] w-[22px] items-center justify-center rounded-[7px]', selected ? 'bg-primary' : 'border-2 border-line-strong')}>
                    {selected ? <Icon icon={CheckIcon} size={12} weight="bold" color="on-primary" /> : null}
                  </View>
                  <View className="flex-1 gap-0.5">
                    <Text weight="medium" className="text-body" numberOfLines={1}>
                      {senderTitle(p)}
                    </Text>
                    <Text mono className="text-meta text-muted" numberOfLines={1}>
                      {p.trackingNumber}
                    </Text>
                  </View>
                  <ParcelBadge status={p.status} short />
                </Pressable>
              );
            })}
          </Card>
        )}

        <SwitchRow label={t('common.sendEmail')} value={sendEmail} onChange={setSendEmail} className="px-1" />
        {error ? <Banner tone="danger">{error}</Banner> : null}

      <UserPicker<PersonOf<ParcelUser>>
        testID="delegate-picker"
        visible={picker === 'user'}
        onClose={() => setPicker(null)}
        title={t('delegations.chooseDelegate')}
        cacheKey="parcel"
        excludeIds={[me.data?.id ?? '']}
        search={async (keyword) => (await parcelsApi.searchUsers(keyword)).items.map(parcelPerson)}
        onSelect={setDelegate}
      />
      <DatePickerSheet
        visible={picker === 'start'}
        onClose={() => setPicker(null)}
        title={t('delegations.startDate')}
        value={startKey}
        minDate={todayKey()}
        onSelect={(key) => {
          setStartKey(key);
          if (endKey <= key) setEndKey(addDays(key, 1));
        }}
      />
      <DatePickerSheet visible={picker === 'end'} onClose={() => setPicker(null)} title={t('delegations.endDate')} value={endKey} minDate={addDays(startKey, 1)} onSelect={setEndKey} />
    </ModuleScreen>
  );
}
