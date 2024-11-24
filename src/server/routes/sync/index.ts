import { Errors } from '@/error';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { randomUUID } from 'node:crypto';
import { get, omit, shake } from 'radash';

import { getClientName } from './client';
import { type ClipboardPayload, sse } from './server-sent-event';

const sync = new Hono<{
  Variables: {
    clientId: string;
    clientName: string;
    roomId: string;
  };
}>()
  .basePath('/sync')
  // 记录 clientId, clientName, roomId
  .use(async (ctx, next) => {
    const { clientId, roomId }: { clientId?: string; roomId?: string } = {
      ...shake({
        clientId: ctx.req.query('clientId'),
        roomId: ctx.req.query('roomId'),
      }),
      ...shake({
        clientId: ctx.req.header('x-client-id'),
        roomId: ctx.req.header('x-room-id'),
      }),
    };

    if (!clientId || !roomId) {
      throw new Errors.ParamsRequired({ keys: ['roomId', 'clientId'], clientId, roomId });
    }

    const clientName = getClientName(ctx, clientId);
    ctx.set('clientName', clientName);

    ctx.set('clientId', clientId);
    ctx.set('roomId', roomId);

    logger.info({ clientId, clientName, roomId });

    await next();
  })
  // 服务器推送
  .get('/sse', async (ctx) => {
    const clientId = ctx.get('clientId');
    const clientName = ctx.get('clientName');
    const roomId = ctx.get('roomId');

    const lastEventId = ctx.req.header('Last-Event-ID');

    return streamSSE(ctx, async (stream) => {
      sse.joinRoom({ clientId, clientName, roomId, stream });

      stream.writeSSE(sse.getOpenData(roomId, lastEventId));

      return new Promise((resolve) => {
        stream.onAbort(() => {
          resolve();
        });
      });
    }, async (e) => {
      console.error(e);
    });
  })
  // 返回纯文本结构
  .get('/', async (ctx) => {
    const data = sse.getLatestClipboardData(ctx.get('roomId'));
    return ctx.json(omit(data ?? { blobs: undefined }, ['blobs']));
  })
  // 返回文件
  .get('/file', async (ctx) => {
    const index = Number(ctx.req.query('i') || '0');

    const data = sse.getLatestClipboardData(ctx.get('roomId'));

    const blob = get<Blob>(data, `blobs[${index}]`);
    if (!blob) {
      throw new Errors.DownloadFailed('no file');
    }

    ctx.header('Content-Type', blob.type);
    // ctx.header('Content-Type', 'application/octet-stream');
    const buffer = await blob.arrayBuffer();
    return ctx.body(buffer);
  })
  // 上传剪切板内容
  .post('/', async (ctx) => {
    const clientId = ctx.get('clientId');
    const roomId = ctx.get('roomId');
    const formData = await ctx.req.formData();

    const data = {
      type: formData.get('type'),
      value: formData.get('value'),
    };

    const blobs = formData.getAll('blobs');

    const clipboardData = {
      ...data,
      blobs,
    } as unknown as ClipboardPayload;

    sse.broadcase(clientId, roomId, clipboardData);
    return ctx.json(data);
  })
  .get('/clients', async (ctx) => {
    const data = sse.getClients(ctx.get('roomId'));
    return ctx.json(data);
  });

export { sync };
