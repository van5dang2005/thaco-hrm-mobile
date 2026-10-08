import type { Href } from 'expo-router';

import type { ServiceId } from '@/core/api/ApiError';
import { env } from '@/core/config/env';
import type vi from '@/core/i18n/locales/vi';
import type { Capability } from '@/core/session/capabilities';
import { defaultDraft, useBookingDraft } from '@/features/room-booking/draftStore';
import {
  type AppIcon,
  BanknoteIcon,
  CalendarCheckIcon,
  CalendarDaysIcon,
  ChartGanttIcon,
  ClockIcon,
  InboxIcon,
  PackageIcon,
  SquareCheckBigIcon,
  UmbrellaIcon,
  UserCheckIcon,
  UsersIcon,
} from '@/shared/ui/icons';

import {
  type Signal,
  staticSummary,
  useDelegationsAwaitingMe,
  useDelegationSummary,
  useFreeRoomsSummary,
  useMeetingsTodaySummary,
  useParcelSummary,
  usePendingApprovals,
  usePendingApprovalsSummary,
  useReceptionSummary,
  useWaitingParcels,
} from './signals';

export type ModuleGroup = 'meeting' | 'parcel' | 'hr';

export const groupOrder: ModuleGroup[] = ['meeting', 'parcel', 'hr'];

/** Key under `home.modules` in the locale files. */
export type ModuleLabelKey = keyof (typeof vi)['home']['modules'];

/**
 * Who may see a module. `service`: the back-end must be connected for this user. `capability`:
 * a server-side permission (see `useCapabilities`; per-resource flags from `my-permissions` are
 * Administrator-only on these back-ends, so they cannot be read for regular staff).
 */
export type ModulePermission = { service: ServiceId; capability?: Capability };

export type HomeModule = {
  id: string;
  group: ModuleGroup;
  labelKey: ModuleLabelKey;
  /** Shorter label for the 4-column "Theo nhóm" layout. */
  shortLabelKey?: ModuleLabelKey;
  /** Small second line under the label in the "Lưới" layout (e.g. "Paytime"). */
  noteKey?: ModuleLabelKey;
  icon: AppIcon;
  /** Screen inside the app. */
  route?: Href;
  /** Runs before navigating to `route` (e.g. start a fresh booking draft). */
  onBeforeOpen?: () => void;
  /** Another app (deep link). Falls back to `storeUrl` when it cannot be opened. Shows the ↗ marker. */
  externalUrl?: string;
  storeUrl?: { ios: string; android: string };
  /** Not served by the back-ends yet: opens the "Sắp ra mắt" screen. */
  comingSoon?: boolean;
  /** Hidden when the user may not use it. */
  permission?: ModulePermission;
  /** Hook: red count on the icon. */
  badge?: () => Signal<number>;
  /** Hook: one-line summary for the "Thẻ" layout. */
  summary?: () => Signal<string>;
  /** "Thẻ" layout: a non-zero badge marks the card as needing action (red border and summary). */
  urgentWhenBadged?: boolean;
};

/**
 * Home utilities, in display order. Add a module by appending an entry: every layout, the
 * permission filter, badges, summaries and the "Tất cả tiện ích" search pick it up.
 *
 * The array must stay a constant: `useModuleSignals` calls each module's hooks in this order.
 */
export const homeModules: readonly HomeModule[] = [
  {
    id: 'book-room',
    group: 'meeting',
    labelKey: 'bookRoom',
    shortLabelKey: 'bookRoomShort',
    icon: CalendarCheckIcon,
    route: '/rooms/book',
    onBeforeOpen: () => useBookingDraft.getState().start(defaultDraft()),
    permission: { service: 'room' },
    summary: useFreeRoomsSummary,
  },
  {
    id: 'my-meetings',
    group: 'meeting',
    labelKey: 'myMeetings',
    icon: CalendarDaysIcon,
    route: '/calendar',
    permission: { service: 'room' },
    summary: useMeetingsTodaySummary,
  },
  {
    id: 'approve-rooms',
    group: 'meeting',
    labelKey: 'approveRooms',
    shortLabelKey: 'approveRoomsShort',
    icon: SquareCheckBigIcon,
    route: '/approvals',
    permission: { service: 'room' },
    badge: usePendingApprovals,
    summary: usePendingApprovalsSummary,
    urgentWhenBadged: true,
  },
  {
    id: 'room-calendar',
    group: 'meeting',
    labelKey: 'roomCalendar',
    icon: ChartGanttIcon,
    route: '/rooms',
    permission: { service: 'room' },
    summary: useFreeRoomsSummary,
  },
  {
    id: 'parcels',
    group: 'parcel',
    labelKey: 'parcels',
    icon: PackageIcon,
    route: '/parcels',
    permission: { service: 'parcel' },
    badge: useWaitingParcels,
    summary: useParcelSummary,
    urgentWhenBadged: true,
  },
  {
    id: 'delegations',
    group: 'parcel',
    labelKey: 'delegations',
    shortLabelKey: 'delegationsShort',
    icon: UserCheckIcon,
    route: '/parcels/delegations',
    permission: { service: 'parcel' },
    badge: useDelegationsAwaitingMe,
    summary: useDelegationSummary,
  },
  {
    id: 'reception',
    group: 'parcel',
    labelKey: 'reception',
    shortLabelKey: 'receptionShort',
    icon: InboxIcon,
    route: '/parcels/reception',
    permission: { service: 'parcel', capability: 'parcel.reception' },
    summary: useReceptionSummary,
  },
  { id: 'leave', group: 'hr', labelKey: 'leave', icon: UmbrellaIcon, comingSoon: true, summary: staticSummary('comingSoon') },
  { id: 'payslip', group: 'hr', labelKey: 'payslip', icon: BanknoteIcon, comingSoon: true, summary: staticSummary('comingSoon') },
  {
    id: 'attendance',
    group: 'hr',
    labelKey: 'attendance',
    noteKey: 'attendanceNote',
    icon: ClockIcon,
    externalUrl: env.paytimeUrl,
    storeUrl: { ios: env.paytimeIosStoreUrl, android: env.paytimeAndroidStoreUrl },
    summary: staticSummary('paytime'),
  },
  {
    id: 'directory',
    group: 'hr',
    labelKey: 'directory',
    icon: UsersIcon,
    route: '/directory',
    summary: staticSummary('directory'),
  },
];
