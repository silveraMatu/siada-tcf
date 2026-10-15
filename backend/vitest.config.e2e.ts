import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  //esbuild no emite la metadata de decoradores que necesita la inyeccion de dependencias de Nest
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    //todos los specs comparten la misma base de datos real
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
