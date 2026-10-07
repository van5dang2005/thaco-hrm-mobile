import type { StateStorage } from 'zustand/middleware';

import { createHomePrefs, defaultHomePrefs, HOME_PREFS_KEY, useHomePrefs } from '../prefs';

function memoryStorage(initial: Record<string, string> = {}): StateStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
    removeItem: (key) => {
      delete data[key];
    },
  };
}

const values = (store: ReturnType<typeof createHomePrefs>) => {
  const { layout, showProfile, draft } = store.getState();
  return { layout, showProfile, draft };
};

describe('useHomePrefs', () => {
  it('defaults to the grid layout with the profile shown', () => {
    expect(defaultHomePrefs).toEqual({ layout: 'grid', showProfile: true });
    const { layout, showProfile, draft } = useHomePrefs.getState();
    expect({ layout, showProfile, draft }).toEqual({ ...defaultHomePrefs, draft: null });
  });

  it('previews a draft without saving it', () => {
    const storage = memoryStorage();
    const store = createHomePrefs(storage);

    store.getState().startDraft();
    store.getState().updateDraft({ layout: 'cards' });
    store.getState().updateDraft({ showProfile: false });

    expect(values(store)).toEqual({ layout: 'grid', showProfile: true, draft: { layout: 'cards', showProfile: false } });
    expect(JSON.parse(storage.data[HOME_PREFS_KEY]).state).toEqual(defaultHomePrefs);
  });

  it('saves the draft on apply and persists only the preferences', () => {
    const storage = memoryStorage();
    const store = createHomePrefs(storage);

    store.getState().startDraft();
    store.getState().updateDraft({ layout: 'grouped', showProfile: false });
    store.getState().applyDraft();

    expect(values(store)).toEqual({ layout: 'grouped', showProfile: false, draft: null });
    expect(JSON.parse(storage.data[HOME_PREFS_KEY]).state).toEqual({ layout: 'grouped', showProfile: false });
  });

  it('drops the draft on discard', () => {
    const store = createHomePrefs(memoryStorage());
    store.getState().updateDraft({ layout: 'cards' });
    store.getState().discardDraft();
    expect(values(store)).toEqual({ ...defaultHomePrefs, draft: null });
  });

  it('restores saved preferences in a new store', () => {
    const storage = memoryStorage();
    const first = createHomePrefs(storage);
    first.getState().updateDraft({ layout: 'cards', showProfile: false });
    first.getState().applyDraft();

    const second = createHomePrefs(storage);
    expect(values(second)).toEqual({ layout: 'cards', showProfile: false, draft: null });
  });

  it('falls back to defaults for unknown stored values', () => {
    const storage = memoryStorage({ [HOME_PREFS_KEY]: JSON.stringify({ state: { layout: 'carousel', showProfile: 'yes' }, version: 1 }) });
    const store = createHomePrefs(storage);
    expect(values(store)).toEqual({ ...defaultHomePrefs, draft: null });
  });
});
