import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  // `migrator.ts` relies on `import.meta.url`; this injects the equivalent shim
  // into the CJS output so the bundled migrations path resolves there too.
  shims: true,
  // Native module — must never be bundled.
  external: ['better-sqlite3'],
  outExtension({ format }) {
    return { js: format === 'cjs' ? '.cjs' : '.js' };
  },
});
