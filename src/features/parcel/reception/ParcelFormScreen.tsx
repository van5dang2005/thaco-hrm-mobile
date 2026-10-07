import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { errorMessage } from '@/core/errors/errorMessage';
import { qk } from '@/core/query/keys';
import { parcelPerson, type ParcelUser, type PersonOf } from '@/core/session/userTypes';
import { atMinutes, formatKey, formatMinutes, minutesOfDay, parseServerDate, todayKey, toDateKey, type DateKey } from '@/core/time/vn';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { DatePickerSheet } from '@/shared/ui/DatePickerSheet';
import { FieldBox } from '@/shared/ui/FieldBox';
import { HeaderBar } from '@/shared/ui/HeaderBar';
import { PersonRow } from '@/shared/ui/PersonRow';
import { ScreenShell } from '@/shared/ui/ScreenShell';
import { Segmented } from '@/shared/ui/Segmented';
import { ListSkeleton } from '@/shared/ui/Skeleton';
import { ErrorState } from '@/shared/ui/StateViews';
import { SwitchRow } from '@/shared/ui/SwitchRow';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';
import { TimeSlotSheet } from '@/shared/ui/TimeSlotSheet';
import { toast } from '@/shared/ui/Toast';
import { UserPicker } from '@/shared/ui/UserPicker';
import { goBack } from '@/shared/lib/navigation';

import { parcelsApi, type ParcelFormInput, type UploadFile } from '../api';
import { useAccessibleDepartments, useParcel } from '../hooks';
import { parseTrackingList, splitTracking } from '../logic';
import { ParcelStatus, type ParcelDto } from '../types';
import { parcelFormSchema, type ParcelForm, type ParcelFormReceiver } from './parcelFormSchema';
import { PhotoPicker } from './PhotoPicker';

const toReceiver = (p: PersonOf<ParcelUser>): ParcelFormReceiver => ({
  id: p.id,
  name: p.name,
  code: p.code,
  department: p.department,
  avatarUrl: p.avatarUrl,
  departmentId: p.user.departmentId,
});

/** "Tiếp nhận bưu phẩm" (one or up to 100 codes) and "Sửa bưu phẩm" (`?id=`). */
export function ParcelFormScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const parcel = useParcel(id);
  if (!id) return <ParcelFormBody />;
  if (parcel.data) return <ParcelFormBody parcel={parcel.data} />;
  return (
    <ScreenShell header={<HeaderBar title={t('reception.formEditTitle')} />}>
      {parcel.isError ? <ErrorState error={parcel.error} onRetry={() => void parcel.refetch()} /> : <ListSkeleton count={3} />}
    </ScreenShell>
  );
}

function ParcelFormBody({ parcel }: { parcel?: ParcelDto }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const departments = useAccessibleDepartments();
  const editing = !!parcel;
  const locked = editing && parcel.status !== ParcelStatus.Waiting;
  const sequence = parcel ? splitTracking(parcel.trackingNumber).sequence : null;

  const { control, handleSubmit, setValue, formState } = useForm<ParcelForm>({
    resolver: zodResolver(parcelFormSchema),
    defaultValues: {
      mode: 'single',
      tracking: parcel ? splitTracking(parcel.trackingNumber).code : '',
      trackingList: '',
      senderFullName: parcel?.senderFullName ?? '',
      senderCompanyName: parcel?.senderCompanyName ?? '',
      senderPhoneNumber: parcel?.senderPhoneNumber ?? '',
      senderAddress: parcel?.senderAddress ?? '',
      description: parcel?.description ?? '',
      receiver: parcel
        ? {
            id: parcel.receiverId,
            name: parcel.receiverFullName,
            code: parcel.receiverCode,
            department: parcel.departmentName,
            avatarUrl: parcel.receiverAvatarUrl,
            departmentId: parcel.departmentId,
          }
        : null,
      isSendEmail: true,
    },
  });
  const [mode, receiver, trackingList, description] = useWatch({ control, name: ['mode', 'receiver', 'trackingList', 'description'] });
  const codeCount = parseTrackingList(trackingList).length;

  const existingReceivedAt = parseServerDate(parcel?.receivedAt);
  /** null = "now" (the server defaults receivedAt to the creation time). */
  const [receivedAt, setReceivedAt] = useState<Date | null>(existingReceivedAt);
  const [keptIds, setKeptIds] = useState<string[]>(parcel?.attachments.map((a) => a.id) ?? []);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [picker, setPicker] = useState<'receiver' | 'date' | 'time' | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const msg = (key?: string) => (key ? t(key as 'validation.required', { max: 200 }) : undefined);

  const save = useMutation({
    mutationFn: async (values: ParcelForm) => {
      const r = values.receiver!;
      const input: ParcelFormInput = {
        senderFullName: values.senderFullName,
        senderCompanyName: values.senderCompanyName,
        senderPhoneNumber: values.senderPhoneNumber,
        senderAddress: values.senderAddress,
        receiverId: r.id,
        // The server derives the unit from the receiver; the field is still required by the validator.
        departmentId: r.departmentId ?? parcel?.departmentId ?? departments.data?.[0]?.id ?? '',
        description: values.description.trim(),
        receivedAt: receivedAt?.toISOString(),
        isSendEmail: values.isSendEmail,
        attachmentFiles: files,
      };
      if (parcel) {
        const updated = await parcelsApi.update(parcel.id, {
          ...input,
          trackingNumber: sequence ? `${sequence}_${values.tracking}` : values.tracking,
          attachmentIds: keptIds,
        });
        return { count: 1, id: updated.id };
      }
      if (values.mode === 'bulk') {
        const created = await parcelsApi.createBulk({ ...input, trackingNumbers: parseTrackingList(values.trackingList) });
        return { count: created.length, id: null };
      }
      const created = await parcelsApi.create({ ...input, trackingNumber: values.tracking });
      return { count: 1, id: created.id };
    },
    onSuccess: ({ count }) => {
      toast.success(editing ? t('reception.updated') : count > 1 ? t('reception.createdBulk', { count }) : t('reception.created'));
      void queryClient.invalidateQueries({ queryKey: qk.parcels.root });
      goBack('/parcels/reception');
    },
    onError: (e) => {
      setSubmitError(errorMessage(e, t));
      // The message sits under the form; bring it into view.
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    },
  });

  const onSubmit = handleSubmit((values) => {
    setSubmitError(null);
    save.mutate(values);
  });

  const receivedKey: DateKey = toDateKey(receivedAt ?? new Date());
  const receivedMinutes = receivedAt ? minutesOfDay(receivedAt) : null;
  const nowMinutes = minutesOfDay(new Date());
  const fileCount = keptIds.length + files.length;

  return (
    <ScreenShell
      header={<HeaderBar title={editing ? t('reception.formEditTitle') : t('reception.formTitle')} />}
      scrollRef={scrollRef}
      footer={
        <Button
          testID="parcel-form-submit"
          className="flex-1"
          label={mode === 'bulk' && codeCount > 1 ? t('reception.saveBulk', { count: codeCount }) : t('reception.save')}
          loading={save.isPending}
          disabled={locked || fileCount > 5}
          onPress={() => void onSubmit()}
        />
      }
    >
        {locked ? <Banner tone="warning">{t('reception.lockedEdit')}</Banner> : null}

        {!editing ? (
          <Segmented<ParcelForm['mode']>
            value={mode}
            onChange={(value) => setValue('mode', value)}
            options={[
              { value: 'single', label: t('reception.modeSingle'), testID: 'parcel-form-single' },
              { value: 'bulk', label: t('reception.modeBulk'), testID: 'parcel-form-bulk' },
            ]}
          />
        ) : null}

        <Card className="gap-3 p-4">
          {mode === 'single' ? (
            <Controller
              control={control}
              name="tracking"
              render={({ field }) => (
                <TextField
                  testID="parcel-form-tracking"
                  appearance="ios"
                  mono
                  label={t('reception.tracking')}
                  placeholder={t('reception.trackingPlaceholder')}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!locked}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  left={sequence ? <Text mono weight="semibold" className="text-body text-muted">{`${sequence}_`}</Text> : undefined}
                  hint={sequence ? t('reception.sequence', { value: sequence }) : undefined}
                  error={msg(formState.errors.tracking?.message)}
                />
              )}
            />
          ) : (
            <Controller
              control={control}
              name="trackingList"
              render={({ field }) => (
                <TextField
                  testID="parcel-form-tracking-list"
                  appearance="ios"
                  mono
                  multiline
                  label={t('reception.trackingList')}
                  placeholder={'SPXVN04418823\nGHN55AB01KZ'}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  style={{ minHeight: 132, textAlignVertical: 'top' }}
                  hint={t('reception.trackingListHint', { count: codeCount })}
                  error={msg(formState.errors.trackingList?.message)}
                />
              )}
            />
          )}
        </Card>

        <Card className="gap-2.5 p-4">
          <Text weight="semibold" className="text-body">
            {t('reception.receiver')}
          </Text>
          {receiver ? (
            <PersonRow
              testID="parcel-form-receiver"
              person={receiver}
              size={40}
              strong
              onPress={locked ? undefined : () => setPicker('receiver')}
              trailing={
                !locked ? (
                  <Text weight="semibold" className="text-sub text-primary">
                    {t('common.change')}
                  </Text>
                ) : undefined
              }
            />
          ) : (
            <Button testID="parcel-form-pick-receiver" variant="soft" size="lg" label={t('reception.chooseParcelReceiver')} onPress={() => setPicker('receiver')} />
          )}
          {receiver?.department ? <Text className="text-meta text-muted">{t('reception.receiverDepartment', { name: receiver.department })}</Text> : null}
          {formState.errors.receiver?.message ? <Text className="text-meta text-danger">{msg(formState.errors.receiver.message)}</Text> : null}
        </Card>

        <Card className="gap-3 p-4">
          <Controller
            control={control}
            name="senderFullName"
            render={({ field }) => (
              <TextField
                testID="parcel-form-sender"
                appearance="ios"
                label={`${t('reception.sender')} *`}
                placeholder={t('reception.senderPlaceholder')}
                editable={!locked}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={msg(formState.errors.senderFullName?.message)}
              />
            )}
          />
          <Controller
            control={control}
            name="senderCompanyName"
            render={({ field }) => (
              <TextField appearance="ios" label={t('reception.senderCompany')} placeholder={t('reception.optional')} editable={!locked} value={field.value} onChangeText={field.onChange} error={msg(formState.errors.senderCompanyName?.message)} />
            )}
          />
          <Controller
            control={control}
            name="senderPhoneNumber"
            render={({ field }) => (
              <TextField
                appearance="ios"
                label={t('reception.senderPhone')}
                placeholder={t('reception.optional')}
                keyboardType="phone-pad"
                editable={!locked}
                value={field.value}
                onChangeText={field.onChange}
                error={msg(formState.errors.senderPhoneNumber?.message)}
              />
            )}
          />
          <Controller
            control={control}
            name="senderAddress"
            render={({ field }) => (
              <TextField appearance="ios" label={t('reception.senderAddress')} placeholder={t('reception.optional')} editable={!locked} value={field.value} onChangeText={field.onChange} error={msg(formState.errors.senderAddress?.message)} />
            )}
          />
        </Card>

        <Card className="gap-3 p-4">
          <Controller
            control={control}
            name="description"
            render={({ field }) => (
              <TextField
                testID="parcel-form-description"
                appearance="ios"
                multiline
                label={t('reception.description')}
                placeholder={t('reception.descriptionPlaceholder')}
                maxLength={1000}
                editable={!locked}
                value={field.value}
                onChangeText={field.onChange}
                hint={t('reception.descriptionCount', { count: description.length })}
                error={msg(formState.errors.description?.message)}
              />
            )}
          />
          <View className="flex-row gap-2">
            <FieldBox label={t('reception.receivedDate')} value={formatKey(receivedKey)} onPress={locked ? undefined : () => setPicker('date')} />
            <FieldBox
              label={t('reception.receivedTime')}
              value={receivedMinutes === null ? t('reception.now') : formatMinutes(receivedMinutes)}
              mono={receivedMinutes !== null}
              onPress={locked ? undefined : () => setPicker('time')}
            />
          </View>
        </Card>

        <Card className="p-4">
          <PhotoPicker
            kept={(parcel?.attachments ?? []).filter((a) => keptIds.includes(a.id))}
            onRemoveKept={(attachmentId) => setKeptIds((list) => list.filter((x) => x !== attachmentId))}
            files={files}
            onChangeFiles={setFiles}
            disabled={locked}
          />
        </Card>

        <Controller
          control={control}
          name="isSendEmail"
          render={({ field }) => <SwitchRow testID="parcel-form-email" label={t('common.sendEmail')} value={field.value} onChange={field.onChange} className="px-1" />}
        />
        {submitError ? <Banner tone="danger">{submitError}</Banner> : null}

      <UserPicker<PersonOf<ParcelUser>>
        testID="parcel-form-receiver-picker"
        visible={picker === 'receiver'}
        onClose={() => setPicker(null)}
        title={t('reception.chooseParcelReceiver')}
        cacheKey="parcel"
        search={async (keyword) => (await parcelsApi.searchUsers(keyword)).items.map(parcelPerson)}
        onSelect={(person) => setValue('receiver', toReceiver(person), { shouldValidate: true })}
      />
      <DatePickerSheet
        visible={picker === 'date'}
        onClose={() => setPicker(null)}
        title={t('reception.receivedDate')}
        value={receivedKey}
        maxDate={todayKey()}
        onSelect={(key) => {
          const minutes = receivedMinutes ?? nowMinutes;
          setReceivedAt(key === todayKey() && minutes > nowMinutes ? new Date() : atMinutes(key, minutes));
        }}
      />
      <TimeSlotSheet
        visible={picker === 'time'}
        onClose={() => setPicker(null)}
        title={t('reception.receivedTime')}
        value={receivedMinutes ?? nowMinutes - (nowMinutes % 5)}
        min={0}
        max={24 * 60 - 5}
        step={5}
        disabled={(minutes) => receivedKey === todayKey() && minutes > nowMinutes}
        onSelect={(minutes) => setReceivedAt(atMinutes(receivedKey, minutes))}
      />
    </ScreenShell>
  );
}
