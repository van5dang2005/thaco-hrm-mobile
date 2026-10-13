import * as SecureStore from 'expo-secure-store';

/**
 * The THACO SSO (Keycloak) pair: one access token for every back-end, refreshed against Keycloak.
 * `receivedAt`: device time the pair arrived (set when stored), to time the refresh token on the device's own clock.
 */
export type TokenPair = { token: string; refreshToken: string; receivedAt?: number };

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

const STORAGE_KEY = 'thaco.session.sso';

/** One pair per back-end, from app versions before SSO; dropped on the next launch. */
const LEGACY_KEYS = ['thaco.session.parcel', 'thaco.session.room'];

let memory: TokenPair | null = null;

/** The signed-in user's SSO pair, cached in memory and persisted in SecureStore. */
export const tokenStore = {
  get(): TokenPair | null {
    return memory;
  },

  async set(pair: TokenPair | null) {
    memory = pair && { ...pair, receivedAt: pair.receivedAt ?? Date.now() };
    await writeChunked(STORAGE_KEY, memory ? JSON.stringify(memory) : null);
  },

  async restore(): Promise<TokenPair | null> {
    try {
      const raw = await readChunked(STORAGE_KEY);
      memory = raw ? (JSON.parse(raw) as TokenPair) : null;
    } catch {
      memory = null;
    }
    if (!memory) await Promise.all(LEGACY_KEYS.map((key) => writeChunked(key, null).catch(() => undefined)));
    return memory;
  },

  async clear() {
    await this.set(null);
  },
};
