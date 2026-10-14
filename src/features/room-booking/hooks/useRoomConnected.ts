import { useSessionStore } from '@/core/session/sessionStore';

export const useRoomConnected = () => useSessionStore((s) => s.connected.room);
