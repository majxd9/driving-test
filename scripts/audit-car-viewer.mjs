import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => {
  const file = path.join(root, relativePath);
  assert.ok(existsSync(file), `Missing required viewer file: ${relativePath}`);
  return readFileSync(file, 'utf8');
};
const required = [
  'client/public/car-explorer/index.html',
  'client/public/car-explorer/viewer.js',
  'client/public/car-explorer/viewer-boot.js',
  'client/public/car-explorer/vendor/three.module.js',
  'client/public/car-explorer/vendor/OrbitControls.js',
  'client/public/car-explorer/vendor/GLTFLoader.js',
  'client/public/car-explorer/vendor/BufferGeometryUtils.js',
  'client/public/car-explorer/vendor/THREE-LICENSE.txt',
  'client/public/car-explorer/challenger-1970.glb',
];
for (const file of required) assert.ok(existsSync(path.join(root, file)), `Missing file: ${file}`);

const html = read('client/public/car-explorer/index.html');
const viewer = read('client/public/car-explorer/viewer.js');
const boot = read('client/public/car-explorer/viewer-boot.js');
const orbit = read('client/public/car-explorer/vendor/OrbitControls.js');
const gltf = read('client/public/car-explorer/vendor/GLTFLoader.js');
const buffer = read('client/public/car-explorer/vendor/BufferGeometryUtils.js');
const headers = read('client/public/_headers');
const appPage = read('client/src/pages/CarExplorer.tsx');
const redirects = read('client/public/_redirects');

assert.ok(!/<script\b(?![^>]*\bsrc\s*=)[^>]*>/i.test(html), 'Inline script found; this site CSP blocks inline scripts');
assert.ok(!html.includes('type="importmap"'), 'Inline import map found; viewer should not need an import map');
assert.ok(html.includes('src="./viewer-boot.js"'), 'Viewer boot/error handler is not linked');
assert.ok(html.includes('type="module" src="./viewer.js"'), 'Viewer module is not linked');
assert.ok(html.includes('id="retryLoad"'), 'Retry button is missing');

assert.ok(viewer.includes('./vendor/three.module.js'), 'Three.js core must be local');
assert.ok(viewer.includes('./vendor/OrbitControls.js'), 'OrbitControls must be local');
assert.ok(viewer.includes('./vendor/GLTFLoader.js'), 'GLTFLoader must be local');
assert.ok(viewer.includes('loader.load("./challenger-1970.glb"'), 'Model URL must resolve next to index.html');
assert.ok(viewer.includes('-box.min.y * scaleFactor'), 'Model should be grounded at the floor');
for (const [file, source] of [['OrbitControls', orbit], ['GLTFLoader', gltf], ['BufferGeometryUtils', buffer]]) {
  assert.ok(!/from\s+['"]three(?:\/[^'"]*)?['"]/.test(source), `${file} still has a bare Three.js import`);
}
assert.ok(gltf.includes("from './BufferGeometryUtils.js'"), 'GLTFLoader utility import is not local');
assert.ok(buffer.includes("from './three.module.js'"), 'BufferGeometryUtils core import is not local');

assert.ok(!appPage.includes('<iframe'), 'React route must not embed a page blocked by X-Frame-Options');
assert.ok(appPage.includes("window.location.replace('/car-explorer/index.html')"), 'React route must open the standalone document');
assert.ok(redirects.split(/\r?\n/).some((line) => line.trim() === '/car-viewer / 200'), 'Deep link fallback for /car-viewer is missing');
assert.ok(headers.includes("X-Frame-Options: DENY"), 'Keep clickjacking protection enabled');
assert.ok(headers.includes("frame-ancestors 'none'"), 'Keep restrictive frame-ancestors policy enabled');
assert.ok(headers.includes("script-src 'self'"), 'Restrictive same-origin script policy must remain enabled');
assert.ok(!headers.includes('cdn.jsdelivr.net') && !headers.includes("! Content-Security-Policy"), 'Obsolete external-CDN or conflicting CSP override remains');

const modelSize = statSync(path.join(root, 'client/public/car-explorer/challenger-1970.glb')).size;
assert.ok(modelSize > 1_000_000, `Model file unexpectedly small: ${modelSize} bytes`);
assert.ok(boot.includes('window.__carViewerShowError') && boot.includes('retryLoad'), 'Visible error/retry behavior is missing');

console.log('3D viewer audit passed.');
console.log(`Model file: ${modelSize.toLocaleString('en-US')} bytes`);
console.log('Local module imports, model path, strict CSP, top-level navigation, and retry UI verified.');
