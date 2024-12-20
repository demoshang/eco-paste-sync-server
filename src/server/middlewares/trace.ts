import type { Context, Next } from 'hono';

import { createMiddleware } from 'hono/factory';
import { randomUUID } from 'node:crypto';
import { styleText } from 'node:util';

import { ALS, TRACE_KEY } from '../../utils/logger';

enum LogPrefix {
  Outgoing = '-->',
  Incoming = '<--',
}

async function trace(ctx: Context, next: Next) {
  const traceId = ctx.get(TRACE_KEY) || randomUUID().slice(0, 6).toUpperCase();
  ctx.set(TRACE_KEY, traceId);
  return ALS.run(traceId, next);
}

function colorStatus(status: number) {
  const str = `${status}`;

  let format: Parameters<typeof styleText>['0'] = 'white';
  switch ((status / 100) | 0) {
    case 5: // error
      format = 'red';
      break;
    case 4: // warning
      format = 'yellow';
      break;
    case 3: // redirect
      format = 'cyan';
      break;
    case 2: // success
      format = 'green';
      break;
    default:
      format = 'white';
  }

  return styleText(format, str);
}

function logRequest(
  method: string,
  url: string,
  query?: object,
  body?: object,
) {
  const logs: any[] = [`${LogPrefix.Incoming}${method} ${url}`];

  if (query && Object.keys(query).length) {
    logs.push(...[`-- query:`, query]);
  }

  if (body && Object.keys(body).length) {
    logs.push(...[`-- body:`, body]);
  }

  logger.info(...logs);
}

function logResponse(ms: number, status = 0, body: any = 'no response body') {
  const logs: any[] = [`${LogPrefix.Outgoing}${colorStatus(status)} - ${ms}ms`];

  logs.push(...[`-- body:`, body, '\n']);

  logger.info(...logs);
}

const loggerMiddleware = createMiddleware(async (ctx, next) => {
  const { method, url: fullUrl } = ctx.req;
  const query = ctx.req.query();

  const url = fullUrl.replace(new URL(fullUrl).origin, '');

  if (!['POST', 'PATCH', 'GET'].includes(method)) {
    logRequest(method, url, query);
  } else {
    const type = ctx.req.header('Content-Type') ?? '';

    let body;
    if (
      type.includes('application/json')
      && (method === 'POST' || method === 'PATCH')
    ) {
      try {
        body = await ctx.req.json();
      } catch {}
    }

    logRequest(method, url, query, body);
  }

  const start = Date.now();

  await next();

  let body;
  const path = ctx.req.path;
  const type = ctx.res.headers.get('content-type');

  if (path.includes('/sync/file')) {
    body = '[octet-stream]';
  } else if (!type) {
    body = '[empty]';
  } else if (type.includes('application/json')) {
    body = await ctx.res.clone().json();
  } else if (type.includes('event-stream')) {
    body = `[${type}]`;
  } else if (type.includes('text/')) {
    body = await ctx.res.clone().text();
  } else {
    body = `[${type}]`;
  }

  const ms = Date.now() - start;
  logResponse(ms, ctx.res.status, body);
});

export { loggerMiddleware, trace };
