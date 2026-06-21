import { useEffect } from 'react';
import { socket } from '../lib/socket';
import { ServerToClientEvents } from '../types';

/**
 * Subscribe to a typed server event for the lifetime of the component.
 * Keeps all raw socket.on/off calls out of components.
 */
export function useSocketEvent<E extends keyof ServerToClientEvents>(
  event: E,
  handler: ServerToClientEvents[E],
): void {
  useEffect(() => {
    socket.on(event, handler as never);
    return () => {
      socket.off(event, handler as never);
    };
  }, [event, handler]);
}

export { socket };
