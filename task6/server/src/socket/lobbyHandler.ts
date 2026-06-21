import { sanitizeConfig } from '../game/configs';
import { logger } from '../utils/logger';
import {
  broadcastLobby,
  buildSessionInfo,
  emitGameState,
  LOBBY_ROOM,
  SocketContext,
  TypedSocket,
} from './shared';

export function registerLobbyHandlers(socket: TypedSocket, ctx: SocketContext): void {
  socket.on('lobby:list', () => {
    socket.join(LOBBY_ROOM);
    socket.emit('lobby:sessions', ctx.sessions.openSessions());
  });

  socket.on('lobby:create', ({ config }) => {
    try {
      const name = ctx.names.getName(socket.id);
      if (!name) return socket.emit('lobby:error', { message: 'Register your callsign first.' });

      const existing = ctx.sessions.findBySocket(socket.id);
      if (existing) {
        return socket.emit('lobby:error', { message: 'You are already in a session.' });
      }

      const safe = sanitizeConfig(config);
      const session = ctx.sessions.create(name, socket.id, safe);
      socket.leave(LOBBY_ROOM);
      socket.join(session.id);

      socket.emit('lobby:joined', { session: buildSessionInfo(session, 'host') });
      broadcastLobby(ctx);
      logger.info(`Session ${session.id.slice(0, 8)} created by ${name}`);
    } catch (err) {
      logger.error('lobby:create failed', err);
      socket.emit('lobby:error', { message: 'Could not create the mission.' });
    }
  });

  socket.on('lobby:createVsCpu', ({ config, difficulty }) => {
    try {
      const name = ctx.names.getName(socket.id);
      if (!name) return socket.emit('lobby:error', { message: 'Register your callsign first.' });

      const existing = ctx.sessions.findBySocket(socket.id);
      if (existing) {
        return socket.emit('lobby:error', { message: 'You are already in a session.' });
      }

      const safe = sanitizeConfig(config);
      const level = difficulty === 'easy' || difficulty === 'hard' ? difficulty : 'normal';
      const session = ctx.sessions.createVsCpu(name, socket.id, safe, level);
      socket.leave(LOBBY_ROOM);
      socket.join(session.id);

      socket.emit('lobby:joined', { session: buildSessionInfo(session, 'host') });
      emitGameState(ctx, session);
      logger.info(`CPU session ${session.id.slice(0, 8)} created by ${name} (${level})`);
    } catch (err) {
      logger.error('lobby:createVsCpu failed', err);
      socket.emit('lobby:error', { message: 'Could not start a CPU mission.' });
    }
  });

  socket.on('lobby:join', ({ roomId }) => {
    try {
      const name = ctx.names.getName(socket.id);
      if (!name) return socket.emit('lobby:error', { message: 'Register your callsign first.' });

      const session = ctx.sessions.get(roomId);
      if (!session) return socket.emit('lobby:error', { message: 'This mission no longer exists.' });
      if (session.state !== 'waiting' || session.guestSocketId) {
        return socket.emit('lobby:error', { message: 'This mission is already full.' });
      }
      if (session.hostSocketId === socket.id) {
        return socket.emit('lobby:error', { message: 'You cannot join your own mission.' });
      }

      session.guestName = name;
      session.guestSocketId = socket.id;
      session.state = 'placing';
      socket.leave(LOBBY_ROOM);
      socket.join(session.id);

      ctx.io.to(session.hostSocketId).emit('lobby:joined', {
        session: buildSessionInfo(session, 'host'),
      });
      socket.emit('lobby:joined', { session: buildSessionInfo(session, 'guest') });

      emitGameState(ctx, session);
      broadcastLobby(ctx);
      logger.info(`${name} joined session ${session.id.slice(0, 8)}`);
    } catch (err) {
      logger.error('lobby:join failed', err);
      socket.emit('lobby:error', { message: 'Could not join the mission.' });
    }
  });

  socket.on('lobby:cancel', ({ roomId }) => {
    const session = ctx.sessions.get(roomId);
    if (!session || session.hostSocketId !== socket.id) return;
    if (session.state !== 'waiting') return;
    ctx.sessions.remove(roomId);
    socket.leave(roomId);
    socket.join(LOBBY_ROOM);
    socket.emit('lobby:sessions', ctx.sessions.openSessions());
    broadcastLobby(ctx);
  });
}
