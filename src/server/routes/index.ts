import { Hono } from 'hono';

import { sync } from './sync';

const api = new Hono({}).basePath('/api').route('', sync);

export { api };
