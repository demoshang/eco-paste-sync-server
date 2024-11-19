import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

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

function getEnvPath() {
  const dirPath = dirname(fileURLToPath(import.meta.url));

  const list = [
    // 运行目录下
    resolve(process.cwd(), `.env.${ENV_NAME}`),
    // 当前目录下
    resolve(dirPath, `.env.${ENV_NAME}`),
    resolve(dirPath, '../', `.env.${ENV_NAME}`),
    resolve(dirPath, '../../', `.env.${ENV_NAME}`),
  ];

  for (const p of list) {
    if (existsSync(p)) {
      return p;
    }
  }

  throw new Errors.EnvInvalid({ ENV_NAME, list }, 'env未找到');
}

const envPath = getEnvPath();

// 获取环境变量
const env = config({
  path: envPath,
})?.parsed as unknown as Env;

if (!env) {
  throw new Errors.EnvInvalid({ envPath }, 'env解析失败');
}

// 获取后端启动的端口
if (process.env.PORT) {
  env.PORT = Number(process.env.PORT);
}

if (!env.PORT) {
  throw new Errors.EnvInvalid(env, 'PORT未找到');
}

env.PORT = Number(env.PORT);

const IS_DEV = ENV_NAME === 'dev';

export type { Env };
export { env, ENV_NAME, IS_DEV };
