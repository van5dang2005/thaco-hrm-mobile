import type { Href } from 'expo-router';

import type { ServiceId } from '@/core/api/ApiError';
import type vi from '@/core/i18n/locales/vi';
import type { Capability } from '@/core/session/capabilities';
import { defaultDraft, useBookingDraft } from '@/features/room-booking/store/draftStore';
import {
  type AppIcon,
  CalendarCheckIcon,
  CalendarDaysIcon,
  ChartGanttIcon,
  InboxIcon,
  PackageIcon,
} from '@/shared/ui/icons';

import {
  type Signal,
  useFreeRoomsSummary,
  useMeetingsTodaySummary,
  useParcelSummary,
  useReceptionSummary,
  useWaitingParcels,
} from './hooks/useSignals';

/** "Theo nhóm" card and icon tone: one per app with screens here, `other` for the apps that open on the web. */
export type ModuleGroup = 'meeting' | 'parcel' | 'other';

/** Key under `home.modules` in the locale files. */
export type ModuleLabelKey = keyof (typeof vi)['home']['modules'];

/**
 * Who may see a module. `service`: the back-end the THACO apps portal must grant (`my-apps`). `capability`:
 * a server-side permission (see `useCapabilities`; per-resource flags from `my-permissions` are
 * Administrator-only on these back-ends, so they cannot be read for regular staff).
 */
export type ModulePermission = { service: ServiceId; capability?: Capability };

/** A locale key for a tile with screens here; the portal's name (`title`) for an app that opens on the web. */
type ModuleLabel =
  | {
      labelKey: ModuleLabelKey;
      /** Shorter label for the 4-column "Theo nhóm" layout. */
      shortLabelKey?: ModuleLabelKey;
      title?: never;
      shortTitle?: never;
    }
  | {
      title: string;
      /** `title` without the "Phần mềm" / "PM" lead, for the 4-column grids. */
      shortTitle?: string;
      labelKey?: never;
      shortLabelKey?: never;
    };

export type HomeModule = ModuleLabel & {
  id: string;
  group: ModuleGroup;
  icon: AppIcon;
  /** Portal image (`MyApp.icon`), shown instead of `icon` unless it fails to load. */
  iconUrl?: string;
  /** Portal description (`MyApp.description`): the "Thẻ" layout's second line for an app without a `summary`. */
  description?: string;
  /** Screen inside the app. */
  route?: Href;
  /** Runs before navigating to `route` (e.g. start a fresh booking draft). */
  onBeforeOpen?: () => void;
  /** Another app or a web page. Falls back to `storeUrl` when it cannot be opened. Shows the ↗ marker. */
  externalUrl?: string;
  storeUrl?: { ios: string; android: string };
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
 * Tiles of the apps with screens here, in display order. Home shows the tiles of each back-end the portal
 * grants (`appModules`); any other granted app gets one tile that opens it on the web. Add a tile by
 * appending an entry: every layout, the permission filter, badges and summaries pick it up.
 *
 * The array must stay a constant: `useModuleSignals` calls each module's hooks in this order.
 */
export const nativeModules: readonly HomeModule[] = [
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
    id: 'reception',
    group: 'parcel',
    labelKey: 'reception',
    shortLabelKey: 'receptionShort',
    icon: InboxIcon,
    route: '/parcels/reception',
    permission: { service: 'parcel', capability: 'parcel.reception' },
    summary: useReceptionSummary,
  },
];
