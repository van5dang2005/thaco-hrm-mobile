import * as SecureStore from 'expo-secure-store';

import type { ServiceId } from '@/core/api/ApiError';

export type TokenPair = { token: string; refreshToken: string };

// SecureStore values above ~2KB can be rejected on Android; JWTs with many claims exceed that.
const CHUNK_SIZE = 1800;

async function writeChunked(key: string, value: string | null) {
  const previous = Number((await SecureStore.getItemAsync(`${key}.n`)) ?? 0);
  await Promise.all(Array.from({ length: previous }, (_, i) => SecureStore.deleteItemAsync(`${key}.${i}`)));
  if (value === null) {
    await SecureStore.deleteItemAsync(`${key}.n`);
    return;
  }
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) chunks.push(value.slice(i, i + CHUNK_SIZE));
  await Promise.all(chunks.map((chunk, i) => SecureStore.setItemAsync(`${key}.${i}`, chunk)));
  await SecureStore.setItemAsync(`${key}.n`, String(chunks.length));
}

async function readChunked(key: string): Promise<string | null> {
  const count = Number((await SecureStore.getItemAsync(`${key}.n`)) ?? 0);
  if (!count) return null;
  const parts = await Promise.all(Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${key}.${i}`)));
  if (parts.some((part) => part === null)) return null;
  return parts.join('');
}

const storageKey = (service: ServiceId) => `thaco.session.${service}`;

const memory: Record<ServiceId, TokenPair | null> = { parcel: null, room: null };

/** Two independent token sets (one per back-end), cached in memory and persisted in SecureStore. */
export const tokenStore = {
  get(service: ServiceId): TokenPair | null {
    return memory[service];
  },

  async set(service: ServiceId, pair: TokenPair | null) {
    memory[service] = pair;
    await writeChunked(storageKey(service), pair ? JSON.stringify(pair) : null);
  },

  async restore(): Promise<Record<ServiceId, TokenPair | null>> {
    for (const service of ['parcel', 'room'] as const) {
      try {
        const raw = await readChunked(storageKey(service));
        memory[service] = raw ? (JSON.parse(raw) as TokenPair) : null;
      } catch {
        memory[service] = null;
      }
    }
    return { ...memory };
  },

  async clear() {
    await Promise.all([this.set('parcel', null), this.set('room', null)]);
  },
};
