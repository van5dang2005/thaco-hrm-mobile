// MMKV v4 loads Nitro native modules on import; tests use its in-memory mock instead.
jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = jest.requireActual('react-native-mmkv/lib/createMMKV/createMockMMKV');
  return { createMMKV: (config) => createMockMMKV(config) };
});
