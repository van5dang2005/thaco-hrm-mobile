import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import { kv } from '@/core/storage/kv';

export type HomeLayout = 'grid' | 'grouped' | 'cards';

export const homeLayouts: HomeLayout[] = ['grid', 'grouped', 'cards'];

export type HomePrefsValues = {
  layout: HomeLayout;
  /** "Cần xử lý" block (pending approvals, parcels, delegations). */
  showTodo: boolean;
  /** "Họp tiếp theo" row in the greeting card. */
  showNextMeeting: boolean;
  /** Module ids in the user's order; modules missing here keep their config order after these. */
  order: string[];
};

export const defaultHomePrefs: HomePrefsValues = { layout: 'grid', showTodo: true, showNextMeeting: true, order: [] };

export type HomePrefsState = HomePrefsValues & {
  /** Unsaved choice from the layout sheet (2h); the home screen previews it behind the sheet. */
  draft: HomePrefsValues | null;
  startDraft: () => void;
  updateDraft: (patch: Partial<HomePrefsValues>) => void;
  applyDraft: () => void;
  discardDraft: () => void;
  /** Saved immediately (the order sheet has its own "Xong"). */
  setOrder: (order: string[]) => void;
};

export const HOME_PREFS_KEY = 'home.prefs';

const pick = (s: HomePrefsValues): HomePrefsValues => ({ layout: s.layout, showTodo: s.showTodo, showNextMeeting: s.showNextMeeting, order: s.order });

function sanitize(value: unknown): HomePrefsValues {
  const v = (value ?? {}) as Partial<HomePrefsValues>;
  return {
    layout: homeLayouts.includes(v.layout as HomeLayout) ? (v.layout as HomeLayout) : defaultHomePrefs.layout,
    showTodo: typeof v.showTodo === 'boolean' ? v.showTodo : defaultHomePrefs.showTodo,
    showNextMeeting: typeof v.showNextMeeting === 'boolean' ? v.showNextMeeting : defaultHomePrefs.showNextMeeting,
    order: Array.isArray(v.order) ? v.order.filter((id): id is string => typeof id === 'string') : defaultHomePrefs.order,
  };
}

/** Store factory; the storage is injectable so tests can run without MMKV. */
export function createHomePrefs(storage: StateStorage) {
  return create<HomePrefsState>()(
    persist(
      (set, get) => ({
        ...defaultHomePrefs,
        draft: null,
        startDraft: () => set({ draft: pick(get()) }),
        updateDraft: (patch) => set({ draft: { ...(get().draft ?? pick(get())), ...patch } }),
        applyDraft: () => {
          const draft = get().draft;
          set(draft ? { ...draft, draft: null } : { draft: null });
        },
        discardDraft: () => set({ draft: null }),
        setOrder: (order) => set({ order }),
      }),
      {
        name: HOME_PREFS_KEY,
        // v1 had { layout, showProfile }: keep the layout, the rest falls back to defaults.
        version: 2,
        migrate: (persisted) => sanitize(persisted),
        storage: createJSONStorage(() => storage),
        partialize: (s) => pick(s),
        merge: (persisted, current) => ({ ...current, ...sanitize(persisted) }),
      },
    ),
  );
}

const mmkvStorage: StateStorage = {
  getItem: (key) => kv.getString(key) ?? null,
  setItem: (key, value) => kv.set(key, value),
  removeItem: (key) => {
    kv.remove(key);
  },
};

/** Home layout preferences (persisted in MMKV). */
export const useHomePrefs = createHomePrefs(mmkvStorage);

/** What the home screen renders: the draft while the layout sheet is open, else the saved prefs. */
export function useEffectiveHomePrefs(): Omit<HomePrefsValues, 'order'> {
  const layout = useHomePrefs((s) => s.draft?.layout ?? s.layout);
  const showTodo = useHomePrefs((s) => s.draft?.showTodo ?? s.showTodo);
  const showNextMeeting = useHomePrefs((s) => s.draft?.showNextMeeting ?? s.showNextMeeting);
  return { layout, showTodo, showNextMeeting };
}

/** `modules` in the saved order: listed ids first, the rest in config order. */
export function orderModules<T extends { id: string }>(modules: readonly T[], order: readonly string[]): T[] {
  const rank = new Map(order.map((id, index) => [id, index]));
  return modules
    .map((module, index) => ({ module, index }))
    .sort((a, b) => (rank.get(a.module.id) ?? order.length + a.index) - (rank.get(b.module.id) ?? order.length + b.index))
    .map(({ module }) => module);
}
