import process from 'node:process';

import { Errors } from './error';

const ENV_NAME = (() => {
  const { NODE_ENV } = process.env;

  let name = NODE_ENV;
  switch (NODE_ENV) {
    case undefined:
    case '':
    case 'dev':
    case 'development':
      name = 'dev';
      break;

    case 'prod':
    case 'production':
      name = 'prod';
      break;

    default:
      name = NODE_ENV;
      break;
  }

  return name;
})();

interface Env {
  // 端口
  PORT: number;
}

const env: Env = { PORT: 18889 };

// 获取后端启动的端口
if (process.env.PORT) {
  env.PORT = Number(process.env.PORT);
}

if (!env.PORT) {
  throw new Errors.EnvInvalid(env, 'PORT未找到');
}

const IS_DEV = ENV_NAME === 'dev';

export { env, ENV_NAME, IS_DEV };
export type { Env };
