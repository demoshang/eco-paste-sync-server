import type { Context } from 'hono';

import { UAParser } from 'ua-parser-js';

function getClientName(ctx: Context, clientId: string) {
  const clientName = ctx.req.header('x-client-name') || ctx.req.query('clientName');

  if (clientName) {
    return clientName;
  }

  const ua = ctx.req.header('User-Agent');
  const parser = new UAParser(ua);
  const os = parser.getOS();
  const browser = parser.getBrowser();

  if (!os.name) {
    return clientId;
  }

  return `${os.name}_${os.version ?? ''}-${browser.name ?? ''}_${browser.version ?? ''}`;
}

export { getClientName };
