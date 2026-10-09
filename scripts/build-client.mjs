import { gzipSync } from 'node:zlib';
import { existsSync, readFileSync, writeFileSync, unlinkSync, statSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const clientRoot = process.cwd();
const sourceModel = path.join(clientRoot, 'public', 'car-explorer', 'challenger-1970.glb');
const sourceCompressed = path.join(clientRoot, 'public', 'car-explorer', 'challenger-1970.glb.gzdata');
const distModel = path.join(clientRoot, 'dist', 'car-explorer', 'challenger-1970.glb');
const distCompressed = path.join(clientRoot, 'dist', 'car-explorer', 'challenger-1970.glb.gzdata');

function runNodeScript(relativePath, args = []) {
  const result = spawnSync(process.execPath, [path.join(clientRoot, relativePath), ...args], {
    cwd: clientRoot,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(relativePath + ' failed with exit code ' + result.status);
}

try {
  if (!existsSync(sourceModel)) throw new Error('Missing original car model: ' + sourceModel);
  const original = readFileSync(sourceModel);
  const compressed = gzipSync(original, { level: 9 });
  if (compressed.byteLength >= original.byteLength) {
    throw new Error('Compression did not reduce the car model size; refusing to publish a larger asset.');
  }
  writeFileSync(sourceCompressed, compressed);
  console.log('Compressed Challenger model: ' + original.byteLength.toLocaleString() + ' -> ' +
    compressed.byteLength.toLocaleString() + ' bytes (' +
    (100 - compressed.byteLength / original.byteLength * 100).toFixed(1) + '% smaller)');

  runNodeScript('node_modules/typescript/bin/tsc', ['-b']);
  runNodeScript('node_modules/vite/bin/vite.js', ['build']);

  if (!existsSync(distCompressed)) throw new Error('Vite output is missing the compressed Challenger model.');
  if (existsSync(distModel)) unlinkSync(distModel);
  if (existsSync(distModel)) throw new Error('Could not remove the uncompressed model from production output.');
  const publishedBytes = statSync(distCompressed).size;
  if (publishedBytes !== compressed.byteLength) throw new Error('Compressed model size changed during the build.');
  console.log('Production model asset: ' + publishedBytes.toLocaleString() +
    ' bytes; uncompressed GLB excluded from deployment output.');
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  if (existsSync(sourceCompressed)) unlinkSync(sourceCompressed);
}
