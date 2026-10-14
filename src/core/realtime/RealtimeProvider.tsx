import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import type { ServiceId } from '@/core/api/ApiError';
import { services } from '@/core/api/clients';
import { qk } from '@/core/query/keys';
import { useSessionStore } from '@/core/session/sessionStore';
import { kv, kvKeys } from '@/core/storage/kv';
import { hrefForNotification, keysForNotification, keysForResource } from '@/features/notification/utils/routing';
import { toast } from '@/shared/ui/Toast';

import { ServiceHub, type HubHandlers } from './hub';

/**
 * Keeps one SignalR connection per connected back-end while the app is in the foreground.
 * - ReceiveNotification: toast (unless turned off in Profile) + bell badge refresh (+ the data the notification is about)
 * - PermissionsUpdated: reload menus / capabilities and profile
 * - ResourceUpdated: invalidate the matching query group (active screens refetch)
 */
export function RealtimeProvider() {
  const queryClient = useQueryClient();
  const connected = useSessionStore((s) => s.connected);
  const hubs = useRef<Partial<Record<ServiceId, ServiceHub>>>({});

  useEffect(() => {
    const invalidate = (keys: readonly (readonly unknown[])[]) => keys.forEach((queryKey) => void queryClient.invalidateQueries({ queryKey }));

    const handlers: HubHandlers = {
      onNotification: (service, payload) => {
        invalidate([qk.notifications.list(service), qk.notifications.unread(service), ...keysForNotification(service)]);
        const popups = kv.getBoolean(kvKeys.notificationPopups) !== false;
        if (popups && (payload.title || payload.content)) {
          toast.notification(payload.title ?? '', payload.content ?? undefined, () =>
            router.push(hrefForNotification(service, payload.bookingId)),
          );
        }
      },
      onPermissionsUpdated: (service) => {
        invalidate([qk.me(service), ...(service === 'parcel' ? [qk.menus] : [])]);
      },
      onResourceUpdated: (service, payload) => invalidate(keysForResource(service, payload.resourceType)),
    };

    const active = services.filter((service) => connected[service]);
    active.forEach((service) => {
      const hub = new ServiceHub(service, handlers);
      hubs.current[service] = hub;
      if (AppState.currentState === 'active') hub.start();
    });

    const subscription = AppState.addEventListener('change', (state) => {
      active.forEach((service) => {
        const hub = hubs.current[service];
        if (!hub) return;
        if (state === 'active') {
          hub.start();
          // Catch up on anything missed while the socket was closed.
          invalidate([qk.notifications.unread(service)]);
        } else if (state === 'background') {
          void hub.stop();
        }
      });
    });

    return () => {
      subscription.remove();
      active.forEach((service) => void hubs.current[service]?.stop());
      hubs.current = {};
    };
  }, [connected, queryClient]);

  return null;
}
