import { useRoomMe } from '@/core/session/useMe';
import { sameId } from '@/core/session/userTypes';
import { kv, kvKeys } from '@/core/storage/kv';

import { useAreas } from './useAreas';

/** Default area: last used, else one linked to my department, else the first. */
export function useDefaultAreaId() {
  const areas = useAreas();
  const me = useRoomMe();
  const list = areas.data ?? [];
  const last = kv.getString(kvKeys.lastAreaId);
  if (last && list.some((a) => sameId(a.id, last))) return last;
  const mine = me.data?.departments?.flatMap((d) => d.areas ?? []) ?? [];
  const linked = list.find((a) => mine.some((m) => sameId(m.id, a.id)) || a.departments?.some((d) => me.data?.departments?.some((u) => sameId(u.id, d.id))));
  return linked?.id ?? list[0]?.id;
}

export function rememberArea(areaId: string) {
  kv.set(kvKeys.lastAreaId, areaId);
}
