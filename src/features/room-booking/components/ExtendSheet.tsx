import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { errorMessage } from '@/core/errors/errorMessage';
import { qk } from '@/core/query/keys';
import { addDays, atMinutes, formatMinutes, toDateKey } from '@/core/time/vn';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { ChoiceChip } from '@/shared/ui/Chip';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Text } from '@/shared/ui/Text';
import { toast } from '@/shared/ui/Toast';

import { bookingsApi } from '../api/booking.api';
import { useSchedule } from '../hooks/useSchedule';
import type { BookingDto } from '../types';
import { bookingFrom, extendOptions } from '../utils/booking';

/** Pick a new end time (same day) for a meeting in progress: ExtendBooking, same rules as the detail screen. */
export function ExtendSheet({ booking, onClose }: { booking: BookingDto | null; onClose: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [choice, setChoice] = useState<number | undefined>();
  const [error, setError] = useState<string | null>(null);
  const from = booking ? bookingFrom(booking) : null;
  const dayKey = from ? toDateKey(from) : undefined;
  const schedule = useSchedule(
    { fromDate: dayKey ? atMinutes(dayKey, 0).toISOString() : '', toDate: dayKey ? atMinutes(addDays(dayKey, 1), 0).toISOString() : '', areaId: booking?.room?.areaId ?? undefined },
    !!booking,
  );
  const options = booking ? extendOptions(booking, booking.room, schedule.data ?? []) : [];
  const selected = choice !== undefined && options.some((o) => o.minutes === choice && !o.taken) ? choice : options.find((o) => !o.taken)?.minutes;

  const extend = useMutation({
    mutationFn: (minutes: number) => bookingsApi.extend(booking!.id, atMinutes(dayKey!, minutes).toISOString()),
    onSuccess: (_, minutes) => {
      toast.success(t('meeting.extended', { time: formatMinutes(minutes) }));
      void queryClient.invalidateQueries({ queryKey: qk.bookings.root });
      onClose();
    },
    onError: (e) => setError(errorMessage(e, t)),
  });

  return (
    <BottomSheet
      testID="extend-sheet"
      visible={!!booking}
      onClose={onClose}
      caption={booking?.code ?? undefined}
      title={t('meeting.extendTo')}
      footer={
        <Button
          testID="extend-sheet-confirm"
          label={selected !== undefined ? t('meeting.extendButton', { time: formatMinutes(selected) }) : t('meeting.extendTo')}
          disabled={selected === undefined}
          loading={extend.isPending}
          onPress={() => {
            setError(null);
            if (selected !== undefined) extend.mutate(selected);
          }}
        />
      }
    >
      {error ? <Banner tone="danger">{error}</Banner> : null}
      <View className="flex-row gap-2">
        {options.map((option) => (
          <ChoiceChip
            key={option.minutes}
            testID={`extend-${formatMinutes(option.minutes)}`}
            mono
            className="h-10 flex-1 rounded-field"
            label={formatMinutes(option.minutes)}
            struck={option.taken}
            selected={selected === option.minutes}
            onPress={() => setChoice(option.minutes)}
          />
        ))}
      </View>
      <Text className="text-meta text-muted">{options.length ? t('meeting.extendNote') : t('meeting.extendNone')}</Text>
    </BottomSheet>
  );
}
