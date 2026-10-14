import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';

import { errorMessage } from '@/core/errors/errorMessage';
import { qk } from '@/core/query/keys';
import { parcelPerson, type ParcelUser, type PersonOf } from '@/core/session/userTypes';
import { atMinutes, formatKey, formatMinutes, minutesOfDay, parseServerDate, toDateKey, type DateKey } from '@/core/time/vn';
import { Banner } from '@/shared/ui/Banner';
import {
  type AppIcon,
  BuildingIcon,
  CalendarDaysIcon,
  ChevronRightIcon,
  ClockIcon,
  ListOrderedIcon,
  MailIcon,
  MapPinIcon,
  PackageIcon,
  PackagePlusIcon,
  PencilIcon,
  PhoneIcon,
  ScanBarcodeIcon,
  SendIcon,
  UserIcon,
  UserPlusIcon,
} from '@/shared/ui/icons';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { DatePickerSheet } from '@/shared/ui/DatePickerSheet';
import { Icon } from '@/shared/ui/Icon';
import { PersonRow } from '@/shared/ui/PersonRow';
import { ModuleHeader } from '@/shared/ui/ModuleHeader';
import { ModuleScreen } from '@/shared/ui/ModuleScreen';
import { RoundIcon } from '@/shared/ui/RoundIcon';
import { SegmentedToggle } from '@/shared/ui/SegmentedToggle';
import { ListSkeleton } from '@/shared/ui/Skeleton';
import { ErrorState } from '@/shared/ui/StateViews';
import { SwitchRow } from '@/shared/ui/SwitchRow';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';
import { TimePickerSheet } from '@/shared/ui/TimePickerSheet';
import { toast } from '@/shared/ui/Toast';
import { UserPicker } from '@/shared/ui/UserPicker';
import { goBack } from '@/shared/lib/navigation';

import { parcelsApi, type ParcelFormInput, type UploadFile } from '../../api/parcel.api';
import { PhotoPicker } from '../../components/PhotoPicker';
import { useAccessibleDepartments } from '../../hooks/useAccessibleDepartments';
import { useParcel } from '../../hooks/useParcel';
import { parcelFormSchema, type ParcelForm, type ParcelFormReceiver } from '../../schemas/parcelForm.schema';
import { ParcelStatus, type ParcelDto } from '../../types';
import { parseTrackingList, splitTracking } from '../../utils/parcel';

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
    <ModuleScreen header={<ModuleHeader icon={PencilIcon} title={t('reception.formEditTitle')} bottom={24} />}>
      {parcel.isError ? <ErrorState error={parcel.error} onRetry={() => void parcel.refetch()} /> : <ListSkeleton count={3} />}
    </ModuleScreen>
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
    <ModuleScreen
      header={
        <ModuleHeader icon={editing ? PencilIcon : PackagePlusIcon} title={editing ? t('reception.formEditTitle') : t('reception.formTitle')} bottom={24} />
      }
      scrollRef={scrollRef}
      footer={
        <Button
          testID="parcel-form-submit"
          className="flex-1"
          label={editing ? t('reception.update') : mode === 'bulk' && codeCount > 1 ? t('reception.saveBulk', { count: codeCount }) : t('reception.save')}
          loading={save.isPending}
          disabled={locked || fileCount > 5}
          onPress={() => void onSubmit()}
        />
      }
    >
      {locked ? <Banner tone="warning">{t('reception.lockedEdit')}</Banner> : null}

      <Section
        icon={PackageIcon}
        title={t('reception.sectionParcel')}
        right={
          mode === 'bulk' ? (
            <Text mono weight="semibold" className="text-meta text-muted">
              {t('reception.codeCount', { count: codeCount })}
            </Text>
          ) : undefined
        }
      >
        {!editing ? (
          <SegmentedToggle<ParcelForm['mode']>
            testID="parcel-form-mode"
            value={mode}
            onChange={(value) => setValue('mode', value)}
            options={[
              { value: 'single', label: t('reception.modeSingle'), icon: ScanBarcodeIcon, testID: 'parcel-form-single' },
              { value: 'bulk', label: t('reception.modeBulk'), icon: ListOrderedIcon, testID: 'parcel-form-bulk' },
            ]}
          />
        ) : null}
        {mode === 'single' ? (
          <Controller
            control={control}
            name="tracking"
            render={({ field }) => (
              <TextField
                testID="parcel-form-tracking"
                filled
                mono
                label={`${t('reception.tracking')} *`}
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
                filled
                mono
                multiline
                label={`${t('reception.trackingList')} *`}
                placeholder={'SPXVN04418823\nGHN55AB01KZ'}
                autoCapitalize="characters"
                autoCorrect={false}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                style={{ minHeight: 132, textAlignVertical: 'top' }}
                hint={t('reception.trackingListHint')}
                error={msg(formState.errors.trackingList?.message)}
              />
            )}
          />
        )}
        <View className="flex-row gap-2.5">
          <PickerBox
            testID="parcel-form-date"
            icon={CalendarDaysIcon}
            label={t('reception.receivedDate')}
            value={formatKey(receivedKey)}
            onPress={locked ? undefined : () => setPicker('date')}
          />
          <PickerBox
            testID="parcel-form-time"
            icon={ClockIcon}
            label={t('reception.receivedTime')}
            value={receivedMinutes === null ? t('reception.now') : formatMinutes(receivedMinutes)}
            mono={receivedMinutes !== null}
            onPress={locked ? undefined : () => setPicker('time')}
          />
        </View>
        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <TextField
              testID="parcel-form-description"
              filled
              multiline
              label={t('reception.description')}
              placeholder={t('reception.descriptionPlaceholder')}
              maxLength={1000}
              editable={!locked}
              value={field.value}
              onChangeText={field.onChange}
              style={{ minHeight: 76 }}
              hint={description.length ? t('reception.descriptionCount', { count: description.length }) : undefined}
              error={msg(formState.errors.description?.message)}
            />
          )}
        />
        <View className="gap-1.5">
          <View className="flex-row items-center justify-between gap-2">
            <Text weight="semibold" className="text-ink-2" style={{ fontSize: 13, lineHeight: 17 }}>
              {t('reception.photos')}
            </Text>
            <Text className="text-meta text-subtle">{t('reception.photosCount', { count: fileCount })}</Text>
          </View>
          <PhotoPicker
            kept={(parcel?.attachments ?? []).filter((a) => keptIds.includes(a.id))}
            onRemoveKept={(attachmentId) => setKeptIds((list) => list.filter((x) => x !== attachmentId))}
            files={files}
            onChangeFiles={setFiles}
            disabled={locked}
          />
        </View>
      </Section>

      <Section icon={UserIcon} title={t('reception.receiver')} required>
        {receiver ? (
          <View className="gap-2.5">
            <PersonRow
              testID="parcel-form-receiver"
              person={receiver}
              size={44}
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
            {receiver.department ? (
              <View className="flex-row items-center gap-2 rounded-[12px] bg-panel px-3 py-2.5">
                <Icon icon={BuildingIcon} size={15} color="muted" />
                <Text numberOfLines={2} className="min-w-0 flex-1 text-meta text-ink-2">
                  {t('reception.receiverDepartment', { name: receiver.department })}
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
          <Pressable
            testID="parcel-form-pick-receiver"
            accessibilityRole="button"
            onPress={() => setPicker('receiver')}
            className="min-h-[64px] flex-row items-center gap-3 rounded-button border-[1.5px] border-dashed border-line-strong bg-panel px-3.5 py-3 active:opacity-70"
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-tint">
              <Icon icon={UserPlusIcon} size={18} color="primary" />
            </View>
            <View className="min-w-0 flex-1 gap-0.5">
              <Text weight="semibold" className="text-body text-primary">
                {t('reception.chooseParcelReceiver')}
              </Text>
              <Text className="text-meta text-muted">{t('reception.receiverSearchHint')}</Text>
            </View>
            <Icon icon={ChevronRightIcon} size={16} color="subtle" />
          </Pressable>
        )}
        {formState.errors.receiver?.message ? <Text className="text-meta text-danger">{msg(formState.errors.receiver.message)}</Text> : null}
        <View className="border-t border-line-2 pt-1">
          <Controller
            control={control}
            name="isSendEmail"
            render={({ field }) => (
              <SwitchRow testID="parcel-form-email" icon={MailIcon} label={t('common.sendEmail')} hint={t('reception.sendEmailHint')} value={field.value} onChange={field.onChange} />
            )}
          />
        </View>
      </Section>

      <Section icon={SendIcon} title={t('reception.sender')} required>
        <Controller
          control={control}
          name="senderFullName"
          render={({ field }) => (
            <TextField
              testID="parcel-form-sender"
              filled
              accessibilityLabel={t('reception.sender')}
              placeholder={t('reception.senderPlaceholder')}
              editable={!locked}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={msg(formState.errors.senderFullName?.message)}
            />
          )}
        />
        <Text className="pt-1 text-meta text-muted">{t('reception.senderMore')}</Text>
        <Controller
          control={control}
          name="senderCompanyName"
          render={({ field }) => (
            <TextField
              filled
              leftIcon={BuildingIcon}
              accessibilityLabel={t('reception.senderCompany')}
              placeholder={t('reception.senderCompany')}
              editable={!locked}
              value={field.value}
              onChangeText={field.onChange}
              error={msg(formState.errors.senderCompanyName?.message)}
            />
          )}
        />
        <Controller
          control={control}
          name="senderPhoneNumber"
          render={({ field }) => (
            <TextField
              filled
              leftIcon={PhoneIcon}
              accessibilityLabel={t('reception.senderPhone')}
              placeholder={t('reception.senderPhone')}
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
            <TextField
              filled
              leftIcon={MapPinIcon}
              accessibilityLabel={t('reception.senderAddress')}
              placeholder={t('reception.senderAddress')}
              editable={!locked}
              value={field.value}
              onChangeText={field.onChange}
              error={msg(formState.errors.senderAddress?.message)}
            />
          )}
        />
      </Section>

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
        onSelect={(key) => setReceivedAt(atMinutes(key, receivedMinutes ?? nowMinutes))}
      />
      <TimePickerSheet
        testID="parcel-form-time-sheet"
        visible={picker === 'time'}
        onClose={() => setPicker(null)}
        title={t('reception.receivedTime')}
        value={receivedMinutes ?? nowMinutes}
        extraLabel={t('reception.now')}
        onExtra={() => setReceivedAt(null)}
        onSelect={(minutes) => setReceivedAt(atMinutes(receivedKey, minutes))}
      />
    </ModuleScreen>
  );
}

/** Form card with a titled header: square glyph, title (+ required star), optional right-hand meta. */
function Section({ icon, title, required, right, children }: { icon: AppIcon; title: string; required?: boolean; right?: ReactNode; children: ReactNode }) {
  return (
    <Card className="gap-3 p-4">
      <View className="flex-row items-center gap-2.5">
        <RoundIcon icon={icon} size={30} square />
        <Text weight="bold" accessibilityRole="header" numberOfLines={1} className="min-w-0 flex-1" style={{ fontSize: 15, lineHeight: 20 }}>
          {title}
          {required ? (
            <Text weight="bold" className="text-danger" style={{ fontSize: 15, lineHeight: 20 }}>
              {' *'}
            </Text>
          ) : null}
        </Text>
        {right}
      </View>
      {children}
    </Card>
  );
}

/** Filled box that opens a picker: glyph, small caption, value (date / time of receipt). */
function PickerBox({ icon, label, value, mono, onPress, testID }: { icon: AppIcon; label: string; value: string; mono?: boolean; onPress?: () => void; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${value}`}
      disabled={!onPress}
      onPress={onPress}
      className="min-h-[56px] min-w-0 flex-1 flex-row items-center gap-2.5 rounded-button bg-field px-3 py-2 active:opacity-70"
    >
      <Icon icon={icon} size={18} color="primary" />
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-meta text-muted">
          {label}
        </Text>
        <Text mono={mono} weight="semibold" numberOfLines={1} style={{ fontSize: 15, lineHeight: 20 }}>
          {value}
        </Text>
      </View>
    </Pressable>
  );
}
