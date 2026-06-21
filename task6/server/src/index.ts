import path from 'path';
import fs from 'fs';
import http from 'http';
import cors from 'cors';
import express from 'express';
import { Server } from 'socket.io';
import { config } from './config';
import { initSocketServer } from './socket';
import { TypedServer } from './socket/shared';
import { logger } from './utils/logger';

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: config.clientOrigins, credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

const io: TypedServer = new Server(server, {
  cors: { origin: config.clientOrigins, methods: ['GET', 'POST'], credentials: true },
});

initSocketServer(io);

// Serve the built client (production) with SPA fallback for client-side routing.
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
  logger.info(`Serving client build from ${clientDist}`);
}

server.listen(config.port, () => {
  logger.success(`Naval Strike server listening on port ${config.port}`);
  logger.info(`CORS origins: ${config.clientOrigins.join(', ')}`);
});
