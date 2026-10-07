import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

import { isApiError } from '@/core/api/ApiError';
import { queryCacheStore } from '@/core/storage/kv';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: (failureCount, error) => {
        // Business / auth errors will not fix themselves; only retry transport failures.
        if (isApiError(error) && error.status > 0 && error.status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

export const queryPersister = createSyncStoragePersister({
  storage: {
    getItem: (key) => queryCacheStore.getString(key) ?? null,
    setItem: (key, value) => queryCacheStore.set(key, value),
    removeItem: (key) => {
      queryCacheStore.remove(key);
    },
  },
  throttleTime: 2000,
});

export function clearQueryCache() {
  queryClient.clear();
  queryCacheStore.clearAll();
}

// Refetch on app foreground (React Native has no window focus events).
AppState.addEventListener('change', (status) => {
  if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
});

// The app is always "online" for TanStack; failures surface as NETWORK errors with a retry button.
onlineManager.setOnline(true);
