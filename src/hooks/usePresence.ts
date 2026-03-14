import { useState, useEffect } from 'react';
import type { WebsocketProvider } from 'y-websocket';

export interface PresenceUser {
  clientId: number;
  name: string;
  color: string;
  emoji?: string;
  avatarUrl?: string;
}

export function usePresence(provider: WebsocketProvider | null): PresenceUser[] {
  const [users, setUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!provider) return;

    const awareness = provider.awareness;

    function updateUsers() {
      const states = Array.from(awareness.getStates().entries());
      const localClientId = awareness.clientID;
      const remote = states
        .filter(([clientId]) => clientId !== localClientId)
        .map(([clientId, state]) => {
          const user = (state as Record<string, unknown>).user as Record<string, unknown> | undefined;
          return {
            clientId,
            name: (user?.name as string) ?? 'Unknown',
            color: (user?.color as string) ?? '#888',
            emoji: user?.emoji as string | undefined,
            avatarUrl: user?.avatarUrl as string | undefined,
          };
        });
      setUsers(remote);
    }

    awareness.on('change', updateUsers);
    updateUsers(); // initial
    return () => awareness.off('change', updateUsers);
  }, [provider]);

  return users;
}
