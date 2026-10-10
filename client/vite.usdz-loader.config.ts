import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const clientRoot = path.dirname(fileURLToPath(import.meta.url));

// Build just the USD loader used by the standalone car-explorer page.
// Three.js stays shared with the viewer's local vendor module; only the
// loader/parsers are bundled into the same-origin helper module.
export default defineConfig({
  root: clientRoot,
  publicDir: false,
  plugins: [
    {
      name: 'use-local-vendored-three-for-usdz-loader',
      renderChunk(code) {
        return {
          code: code.replace(/from\s+(['"])three\1/g, "from './vendor/three.module.js'"),
          map: null,
        };
      },
    },
  ],
  build: {
    target: 'es2020',
    minify: false,
    sourcemap: false,
    emptyOutDir: false,
    outDir: path.resolve(clientRoot, 'public/car-explorer'),
    lib: {
      entry: path.resolve(clientRoot, 'node_modules/three/examples/jsm/loaders/USDLoader.js'),
      formats: ['es'],
      fileName: () => 'guide-usdz-loader.js',
    },
    rolldownOptions: {
      external: ['three'],
      output: {
        entryFileNames: 'guide-usdz-loader.js',
      },
    },
  },
});
