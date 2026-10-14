import { useState } from 'react';

/**
 * State for a RefreshControl. Only a pull shows the spinner: background refetches (invalidation,
 * realtime ResourceUpdated, focus) stay silent. Binding `refreshing` to a query's `isRefetching`
 * shows the spinner without a pull, and on iOS it then stays stuck at the top.
 */
export function usePullRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };
  return { refreshing, onRefresh };
}
