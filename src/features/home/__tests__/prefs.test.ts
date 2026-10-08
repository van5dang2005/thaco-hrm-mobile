import type { StateStorage } from 'zustand/middleware';

import { createHomePrefs, defaultHomePrefs, HOME_PREFS_KEY, orderModules, useHomePrefs } from '../prefs';

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
  const { layout, showTodo, showNextMeeting, order, draft } = store.getState();
  return { layout, showTodo, showNextMeeting, order, draft };
};

describe('useHomePrefs', () => {
  it('defaults to the grid layout with both blocks shown', () => {
    expect(defaultHomePrefs).toEqual({ layout: 'grid', showTodo: true, showNextMeeting: true, order: [] });
    const { layout, showTodo, showNextMeeting, order, draft } = useHomePrefs.getState();
    expect({ layout, showTodo, showNextMeeting, order, draft }).toEqual({ ...defaultHomePrefs, draft: null });
  });

  it('previews a draft without saving it', () => {
    const storage = memoryStorage();
    const store = createHomePrefs(storage);

    store.getState().startDraft();
    store.getState().updateDraft({ layout: 'cards' });
    store.getState().updateDraft({ showTodo: false });

    expect(values(store)).toEqual({ ...defaultHomePrefs, draft: { ...defaultHomePrefs, layout: 'cards', showTodo: false } });
    expect(JSON.parse(storage.data[HOME_PREFS_KEY]).state).toEqual(defaultHomePrefs);
  });

  it('saves the draft on apply and persists only the preferences', () => {
    const storage = memoryStorage();
    const store = createHomePrefs(storage);

    store.getState().startDraft();
    store.getState().updateDraft({ layout: 'grouped', showNextMeeting: false });
    store.getState().applyDraft();

    const saved = { ...defaultHomePrefs, layout: 'grouped', showNextMeeting: false };
    expect(values(store)).toEqual({ ...saved, draft: null });
    expect(JSON.parse(storage.data[HOME_PREFS_KEY]).state).toEqual(saved);
  });

  it('drops the draft on discard', () => {
    const store = createHomePrefs(memoryStorage());
    store.getState().updateDraft({ layout: 'cards' });
    store.getState().discardDraft();
    expect(values(store)).toEqual({ ...defaultHomePrefs, draft: null });
  });

  it('restores saved preferences and order in a new store', () => {
    const storage = memoryStorage();
    const first = createHomePrefs(storage);
    first.getState().updateDraft({ layout: 'cards', showTodo: false });
    first.getState().applyDraft();
    first.getState().setOrder(['parcels', 'book-room']);

    const second = createHomePrefs(storage);
    expect(values(second)).toEqual({ ...defaultHomePrefs, layout: 'cards', showTodo: false, order: ['parcels', 'book-room'], draft: null });
  });

  it('keeps the layout of a v1 store and defaults the rest', () => {
    const storage = memoryStorage({ [HOME_PREFS_KEY]: JSON.stringify({ state: { layout: 'grouped', showProfile: false }, version: 1 }) });
    const store = createHomePrefs(storage);
    expect(values(store)).toEqual({ ...defaultHomePrefs, layout: 'grouped', draft: null });
  });

  it('falls back to defaults for unknown stored values', () => {
    const storage = memoryStorage({ [HOME_PREFS_KEY]: JSON.stringify({ state: { layout: 'carousel', showTodo: 'yes', order: 'x' }, version: 2 }) });
    const store = createHomePrefs(storage);
    expect(values(store)).toEqual({ ...defaultHomePrefs, draft: null });
  });
});

describe('orderModules', () => {
  const modules = ['a', 'b', 'c', 'd'].map((id) => ({ id }));

  it('puts the saved ids first and keeps config order for the rest', () => {
    expect(orderModules(modules, ['c', 'a']).map((m) => m.id)).toEqual(['c', 'a', 'b', 'd']);
  });

  it('ignores ids that are no longer configured', () => {
    expect(orderModules(modules, ['x', 'd']).map((m) => m.id)).toEqual(['d', 'a', 'b', 'c']);
  });
});
