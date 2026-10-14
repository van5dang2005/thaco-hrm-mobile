import { z } from 'zod';

import { duplicatesOf, MAX_BULK_CODES, parseTrackingList } from '../utils/parcel';

/** Messages are i18n keys, translated at render time. Limits mirror Create(Bulk)ParcelCommandValidator. */
export const parcelFormSchema = z
  .object({
    mode: z.enum(['single', 'bulk']),
    tracking: z.string().trim().max(100, 'reception.trackingTooLong'),
    trackingList: z.string(),
    senderFullName: z.string().trim().min(1, 'reception.requiredSender').max(200, 'validation.maxLength'),
    senderCompanyName: z.string().trim().max(200, 'validation.maxLength'),
    senderPhoneNumber: z.string().trim().max(20, 'validation.maxLength'),
    senderAddress: z.string().trim().max(500, 'validation.maxLength'),
    description: z.string().max(1000, 'errors.PARCEL_DESCRIPTION_MAX_LENGTH'),
    receiver: z
      .object({
        id: z.string(),
        name: z.string(),
        code: z.string().nullish(),
        department: z.string().nullish(),
        avatarUrl: z.string().nullish(),
        departmentId: z.string().nullish(),
      })
      .nullable()
      .refine((value): boolean => !!value, 'reception.requiredReceiver'),
    isSendEmail: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.mode === 'single') {
      if (!value.tracking) ctx.addIssue({ code: 'custom', path: ['tracking'], message: 'reception.requiredTracking' });
      return;
    }
    const codes = parseTrackingList(value.trackingList);
    const issue = !codes.length
      ? 'reception.requiredTracking'
      : codes.length > MAX_BULK_CODES
        ? 'reception.tooManyCodes'
        : codes.some((code) => code.length > 100)
          ? 'reception.trackingTooLong'
          : duplicatesOf(codes).length
            ? 'reception.duplicateCodes'
            : null;
    if (issue) ctx.addIssue({ code: 'custom', path: ['trackingList'], message: issue });
  });

export type ParcelForm = z.infer<typeof parcelFormSchema>;
export type ParcelFormReceiver = NonNullable<ParcelForm['receiver']>;
