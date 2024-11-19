import { env } from '@/env';
import { serve } from '@hono/node-server';
import process from 'node:process';

import { app } from './app';

const server = serve({
  fetch: app.fetch,
  port: env.PORT,
}, (info) => {
  logger.info(`Start Server at http://localhost:${info.port}`);
});

process.once('SIGUSR2', () => {
  server.close(() => {
    process.kill(process.pid, 'SIGUSR2');
  });
});

process.on('SIGINT', () => {
  server.close(() => {
    process.exit(0);
  });
});

export { app };
