import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  noExternal: [/.*/], // 包含 node_modules 下的所有文件
});
