import { fetchWithTimeout } from '@/core/api/fetchWithTimeout';
import { refreshSso } from '@/core/session/sso';
import { tokenStore } from '@/core/session/tokenStore';

import { createApiClient, setUnauthorizedHandler } from '../http';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/core/api/fetchWithTimeout', () => ({ fetchWithTimeout: jest.fn() }));
jest.mock('@/core/session/sso', () => ({ refreshSso: jest.fn() }));

const fetchMock = fetchWithTimeout as jest.Mock;
const refreshMock = refreshSso as jest.Mock;
const onUnauthorized = jest.fn();
setUnauthorizedHandler(onUnauthorized);

const api = createApiClient('parcel', 'https://parcel.test');
const reply = (status: number, body?: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: '',
  text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
});

beforeEach(async () => {
  jest.clearAllMocks();
  await tokenStore.set({ token: 'access-1', refreshToken: 'refresh-1' });
});

describe('a 401 from a back-end', () => {
  it('retries with the refreshed token', async () => {
    fetchMock.mockResolvedValueOnce(reply(401)).mockResolvedValueOnce(reply(200, { id: 1 }));
    refreshMock.mockImplementationOnce(async () => {
      await tokenStore.set({ token: 'access-2', refreshToken: 'refresh-2' });
      return 'refreshed';
    });
    await expect(api.get('/api/parcels/my')).resolves.toEqual({ id: 1 });
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer access-2');
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('signs out once Keycloak refuses the refresh token', async () => {
    fetchMock.mockResolvedValueOnce(reply(401));
    refreshMock.mockResolvedValueOnce('rejected');
    await expect(api.get('/api/parcels/my')).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledWith('parcel');
  });

  it('keeps the session and reports a network error while Keycloak is unreachable', async () => {
    fetchMock.mockResolvedValueOnce(reply(401));
    refreshMock.mockResolvedValueOnce('unavailable');
    await expect(api.get('/api/parcels/my')).rejects.toMatchObject({ status: 0, errorCode: 'NETWORK' });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
