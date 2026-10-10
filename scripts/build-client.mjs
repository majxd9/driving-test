import { gzipSync } from 'node:zlib';
import { existsSync, readFileSync, writeFileSync, unlinkSync, statSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const clientRoot = process.cwd();
const sourceModel = path.join(clientRoot, 'public', 'car-explorer', 'challenger-1970.glb');
const sourceOptimized = path.join(clientRoot, 'public', 'car-explorer', 'challenger-1970.optimized.glb');
const sourceCompressed = path.join(clientRoot, 'public', 'car-explorer', 'challenger-1970.glb.gzdata');
const distModel = path.join(clientRoot, 'dist', 'car-explorer', 'challenger-1970.glb');
const distOptimized = path.join(clientRoot, 'dist', 'car-explorer', 'challenger-1970.optimized.glb');
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
  const originalCompressed = gzipSync(original, { level: 9 });
  let selectedModel = original;
  let compressed = originalCompressed;
  let optimizationUsed = false;

  // Generate a web-first GLB at build time. The transform keeps nodes/meshes
  // separate because the viewer exposes individual car parts in the sidebar.
  // If optimization fails or does not reduce the actual gzip transfer size,
  // publish the original compressed model instead of risking a broken release.
  if (existsSync(sourceOptimized)) unlinkSync(sourceOptimized);
  try {
    const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const result = spawnSync(npx, [
      '--yes', '@gltf-transform/cli@4.5.1', 'optimize',
      sourceModel, sourceOptimized,
      '--compress', 'false',
      '--texture-compress', 'webp',
      '--texture-size', '1024',
      '--flatten', 'false',
      '--join', 'false',
    ], { cwd: clientRoot, stdio: 'inherit', shell: process.platform === 'win32' });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error('glTF Transform exited with code ' + result.status);
    if (!existsSync(sourceOptimized)) throw new Error('glTF Transform did not create the optimized model.');

    const candidate = readFileSync(sourceOptimized);
    const candidateCompressed = gzipSync(candidate, { level: 9 });
    console.log('Texture-optimized GLB: ' + original.byteLength.toLocaleString() + ' -> ' +
      candidate.byteLength.toLocaleString() + ' bytes.');
    if (candidateCompressed.byteLength < originalCompressed.byteLength) {
      selectedModel = candidate;
      compressed = candidateCompressed;
      optimizationUsed = true;
      console.log('Using optimized GLB; gzip transfer size reduced from ' +
        originalCompressed.byteLength.toLocaleString() + ' -> ' +
        candidateCompressed.byteLength.toLocaleString() + ' bytes (' +
        (100 - candidateCompressed.byteLength / originalCompressed.byteLength * 100).toFixed(1) + '% smaller).');
    } else {
      console.warn('Texture optimization did not reduce gzip transfer size; keeping the original model.');
    }
  } catch (optimizationError) {
    console.warn('Optional GLB texture optimization failed; keeping the safe original compressed model:', optimizationError);
  }

  const compressedForSource = gzipSync(selectedModel, { level: 9 });
  if (compressedForSource.byteLength >= original.byteLength) {
    throw new Error('Compression did not reduce the car model size; refusing to publish a larger asset.');
  }
  compressed = compressedForSource;
  writeFileSync(sourceCompressed, compressed);
  console.log((optimizationUsed ? 'Optimized ' : 'Original ') + 'Challenger transfer asset: ' +
    original.byteLength.toLocaleString() + ' -> ' + compressed.byteLength.toLocaleString() +
    ' bytes (' + (100 - compressed.byteLength / original.byteLength * 100).toFixed(1) + '% smaller vs original GLB).');

  // Create a self-contained USDZ parser bundle for the standalone viewer.
  // The loader shares the viewer's existing local Three.js module and avoids a CDN.
  runNodeScript('node_modules/vite/bin/vite.js', ['build', '--config', 'vite.usdz-loader.config.ts']);
  const standaloneUsdLoader = path.join(clientRoot, 'public', 'car-explorer', 'guide-usdz-loader.js');
  if (!existsSync(standaloneUsdLoader)) throw new Error('Standalone USDZ loader bundle was not generated.');
  const standaloneUsdLoaderSource = readFileSync(standaloneUsdLoader, 'utf8');
  if (!standaloneUsdLoaderSource.includes("./vendor/three.module.js") ||
      /from\\s+['"]three['"]/.test(standaloneUsdLoaderSource)) {
    throw new Error('Standalone USDZ loader must import the local Three.js module, not a bare package or CDN.');
  }
  console.log('Standalone USDZ loader bundle prepared with local dependencies.');

  runNodeScript('node_modules/typescript/bin/tsc', ['-b']);
  runNodeScript('node_modules/vite/bin/vite.js', ['build']);

  if (!existsSync(distCompressed)) throw new Error('Vite output is missing the compressed Challenger model.');
  if (!existsSync(distModel)) throw new Error('Vite output is missing the original Challenger model fallback.');
  if (existsSync(distOptimized)) unlinkSync(distOptimized);
  if (statSync(distModel).size !== original.byteLength) throw new Error('Original model size changed during the build.');
  const publishedBytes = statSync(distCompressed).size;
  if (publishedBytes !== compressed.byteLength) throw new Error('Compressed model size changed during the build.');
  console.log('Production model assets: compressed ' + publishedBytes.toLocaleString() +
    ' bytes (preferred), original ' + original.byteLength.toLocaleString() +
    ' bytes (downloaded only as a compatibility fallback).');
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  for (const temporary of [sourceCompressed, sourceOptimized, distOptimized]) {
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}
