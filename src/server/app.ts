import { IS_DEV } from '@/env';
import { Errors } from '@/error';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { loggerMiddleware, trace } from './middlewares/trace';
import { api } from './routes';

const app = new Hono()
  .use(trace)
  .use(loggerMiddleware)
  .use(cors({ origin: '*' }))
  .notFound((ctx) => {
    return ctx.json({
      code: 404,
      message: 'not found',
    }, 404);
  })
  .onError((e, ctx) => {
    if (e instanceof Errors.OperationalError) {
      ctx.status((e.status || 400) as 400);

      const { stack, ...data } = e.toJSON();

      logger.warn(e.toString());

      return ctx.json({
        code: e.status || 400,
        message: e.message,
        data: IS_DEV ? { stack, ...data } : data,
      });
    }

    logger.warn(e);
    ctx.status(500);

    return ctx.json({
      code: 500,
      message: (e as any)?.message,
    });
  })
  .route('', api);

export { app };
