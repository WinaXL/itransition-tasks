import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '../types';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const url = import.meta.env.VITE_SERVER_URL || undefined;

/** Singleton socket. `undefined` url => same-origin (production combined build). */
export const socket: AppSocket = io(url, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
});
