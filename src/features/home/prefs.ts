import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import { kv } from '@/core/storage/kv';

export type HomeLayout = 'grid' | 'grouped' | 'cards';

export const homeLayouts: HomeLayout[] = ['grid', 'grouped', 'cards'];

export type HomePrefsValues = { layout: HomeLayout; showProfile: boolean };

export const defaultHomePrefs: HomePrefsValues = { layout: 'grid', showProfile: true };

export type HomePrefsState = HomePrefsValues & {
  /** Unsaved choice from the layout sheet (2h); the home screen previews it behind the sheet. */
  draft: HomePrefsValues | null;
  startDraft: () => void;
  updateDraft: (patch: Partial<HomePrefsValues>) => void;
  applyDraft: () => void;
  discardDraft: () => void;
};

export const HOME_PREFS_KEY = 'home.prefs';

function sanitize(value: unknown): HomePrefsValues {
  const v = (value ?? {}) as Partial<HomePrefsValues>;
  return {
    layout: homeLayouts.includes(v.layout as HomeLayout) ? (v.layout as HomeLayout) : defaultHomePrefs.layout,
    showProfile: typeof v.showProfile === 'boolean' ? v.showProfile : defaultHomePrefs.showProfile,
  };
}

/** Store factory; the storage is injectable so tests can run without MMKV. */
export function createHomePrefs(storage: StateStorage) {
  return create<HomePrefsState>()(
    persist(
      (set, get) => ({
        ...defaultHomePrefs,
        draft: null,
        startDraft: () => set({ draft: { layout: get().layout, showProfile: get().showProfile } }),
        updateDraft: (patch) => {
          const base = get().draft ?? { layout: get().layout, showProfile: get().showProfile };
          set({ draft: { ...base, ...patch } });
        },
        applyDraft: () => {
          const draft = get().draft;
          set(draft ? { ...draft, draft: null } : { draft: null });
        },
        discardDraft: () => set({ draft: null }),
      }),
      {
        name: HOME_PREFS_KEY,
        version: 1,
        storage: createJSONStorage(() => storage),
        partialize: (s) => ({ layout: s.layout, showProfile: s.showProfile }),
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
export function useEffectiveHomePrefs(): HomePrefsValues {
  const layout = useHomePrefs((s) => s.draft?.layout ?? s.layout);
  const showProfile = useHomePrefs((s) => s.draft?.showProfile ?? s.showProfile);
  return { layout, showProfile };
}
