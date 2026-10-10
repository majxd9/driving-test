import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
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
  'client/public/car-explorer/viewer-premium.css',
  'client/public/car-explorer/viewer.js',
  'client/public/car-explorer/viewer-boot.js',
  'client/public/car-explorer/guide-assistant.js',
  'client/public/car-explorer/guide-assistant.css',
  'server/Services/SystemAudioCatalog.cs',
  'server/Services/SystemAudioPromptService.cs',
  'client/public/car-explorer/vendor/three.module.js',
  'client/public/car-explorer/vendor/OrbitControls.js',
  'client/public/car-explorer/vendor/GLTFLoader.js',
  'client/public/car-explorer/vendor/BufferGeometryUtils.js',
  'client/public/car-explorer/vendor/THREE-LICENSE.txt',
  'client/public/car-explorer/challenger-1970.glb',
];
for (const file of required) assert.ok(existsSync(path.join(root, file)), `Missing file: ${file}`);

const syntaxCheck = spawnSync(process.execPath, ['--check', path.join(root, 'client/public/car-explorer/viewer.js')], { encoding: 'utf8' });
assert.equal(syntaxCheck.status, 0, 'Car viewer JavaScript syntax check failed: ' + (syntaxCheck.stderr || syntaxCheck.stdout || 'unknown error'));
const guideSyntaxCheck = spawnSync(process.execPath, ['--check', path.join(root, 'client/public/car-explorer/guide-assistant.js')], { encoding: 'utf8' });
assert.equal(guideSyntaxCheck.status, 0, 'Car guide assistant JavaScript syntax check failed: ' + (guideSyntaxCheck.stderr || guideSyntaxCheck.stdout || 'unknown error'));
const html = read('client/public/car-explorer/index.html');
const viewer = read('client/public/car-explorer/viewer.js');
const guideAssistant = read('client/public/car-explorer/guide-assistant.js');
const guideAssistantCss = read('client/public/car-explorer/guide-assistant.css');
const systemAudioCatalog = read('server/Services/SystemAudioCatalog.cs');
const systemAudioPrompts = read('server/Services/SystemAudioPromptService.cs');
const systemAudioGeneratorInterfaces = read('server/Services/IQuestionAiGenerators.cs');
const serverProgram = read('server/Program.cs');
const premiumCss = read('client/public/car-explorer/viewer-premium.css');
const buildScript = read('scripts/build-client.mjs');
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
assert.ok(html.includes('href="./viewer-premium.css"'), 'Premium viewer CSS is not linked');
assert.ok(html.includes('href="./guide-assistant.css"'), 'Car guide assistant CSS is not linked');
assert.ok(html.includes('src="./guide-assistant.js"'), 'Car guide assistant script is not linked');
assert.ok(html.includes('<details class="guide-assistant" id="guideAssistant">'), 'Guide assistant must use native disclosure so it can open without JavaScript');
assert.ok(html.includes('<summary class="guide-assistant-toggle" id="guideAssistantToggle"'), 'Guide assistant native open control is missing');
assert.ok(guideAssistantCss.includes('.guide-assistant[open] .guide-assistant-panel{display:block}'), 'Guide assistant open-state styling is missing');
assert.ok(guideAssistant.includes('root.addEventListener("toggle"') && guideAssistant.includes('root.dataset.initialized = "true"'), 'Guide assistant did not initialize its disclosure handlers');
assert.ok(html.includes('meta name="api-base-url"'), 'The guide assistant API base URL is missing');
assert.ok(!/guideAssistantAudio[^>]*autoplay/i.test(html), 'The guide assistant must not autoplay audio');
assert.ok(guideAssistant.includes('car-guide-welcome') && guideAssistant.includes('car-guide-rotate') && guideAssistant.includes('car-guide-zoom') && guideAssistant.includes('car-guide-parts') && guideAssistant.includes('car-guide-quality'), 'Guide audio topic keys are incomplete');
assert.ok(guideAssistant.includes('speechSynthesis') && guideAssistant.includes('audio.onerror'), 'Guide assistant speech fallback is missing');
assert.ok(guideAssistantCss.includes('@media(max-width:480px)') && guideAssistantCss.includes('prefers-reduced-motion:reduce'), 'Guide assistant responsive/reduced-motion styles are missing');
assert.ok(systemAudioCatalog.includes('CarGuideWelcome') && systemAudioCatalog.includes('CarGuideQuality'), 'Guide audio keys are not registered in the backend');
assert.ok(systemAudioPrompts.includes('CarGuideWelcome =>') && systemAudioPrompts.includes('Optional car-guide audio generation failed'), 'Guide audio generation is not safely integrated');
assert.ok(systemAudioGeneratorInterfaces.includes('interface ITextToSpeechGenerator'), 'Configured system-text speech interface is missing');
assert.ok(serverProgram.includes('AddScoped<ITextToSpeechGenerator>') && systemAudioPrompts.includes('QUESTION_AUDIO_PROVIDER'), 'System guide audio must follow the configured audio provider');
assert.ok(systemAudioPrompts.includes('existing ElevenLabs/Eden AI fallback'), 'Guide audio provider fallback is missing');
assert.ok(headers.includes('media-src') && headers.includes('https://driving-test-evd0.onrender.com;'), 'CSP does not permit guide audio from the API');
assert.ok(premiumCss.includes('@media(max-width:850px)'), 'Mobile layout is missing');
assert.ok(viewer.includes('mainPartDefinitions'), 'Human-readable main part list is missing');
assert.ok(viewer.includes('id:"engine",label:"المحرك",category:"engine"'), 'Engine category is missing from the main part list');
assert.ok(viewer.includes('chosenById.set(def.id, []);'), 'Unknown parts must not be randomly labeled as a different main part');
assert.ok(viewer.includes('buildMainPartEntries()'), 'Main part grouping is missing');
assert.ok(!viewer.includes('list.slice(0, 300)'), 'Technical mesh list must not be exposed');
assert.ok(html.includes('id="retryLoad"'), 'Retry button is missing');

assert.ok(viewer.includes('./vendor/three.module.js'), 'Three.js core must be local');
assert.ok(viewer.includes('./vendor/OrbitControls.js'), 'OrbitControls must be local');
assert.ok(viewer.includes('./vendor/GLTFLoader.js'), 'GLTFLoader must be local');
assert.ok(viewer.includes('challenger-1970.glb.gzdata'), 'Viewer must prefer the compressed model');
assert.ok(viewer.includes('qualityProfiles ='), 'Graphics quality profiles are missing');
assert.ok(viewer.includes('qualitySelect.addEventListener("change"'), 'Graphics quality selector is not wired');
assert.ok(html.includes('id="carSelect"'), 'Vehicle selector is missing');
assert.ok(html.includes('<option value="mclaren" selected>McLaren Senna GTR</option>'), 'McLaren must be the default vehicle');
assert.ok(html.includes('<option value="mustang">Ford Mustang GT</option>'), 'Ford Mustang must be the second vehicle option');
assert.ok(viewer.includes('let currentQuality = "medium"'), 'Medium graphics quality must be the default');
assert.ok(viewer.includes('urlForQuality') && viewer.includes('mclaren-senna-gtr-'), 'McLaren quality-specific assets are not wired');
assert.ok(viewer.includes('mustang-2005.glb'), 'Ford Mustang model source is missing');
assert.ok(html.includes('data-move="x:-1"') && viewer.includes('button.dataset.move'), 'Individual mesh movement controls are missing');
assert.ok(viewer.includes('controls.minDistance = 0.25'), 'Interior camera zoom support is missing');
assert.ok(html.includes('id="qualitySelect"'), 'Graphics quality selector is missing from the UI');
assert.ok(html.includes('<option value="low">اقتصادية</option>') && html.includes('<option value="medium">متوسطة</option>') && html.includes('<option value="high">عالية</option>'), 'All three graphics quality levels must be available');
assert.ok(headers.includes("Content-Encoding: gzip"), "Compressed model must be browser-decompressed via HTTP Content-Encoding");
assert.ok(viewer.includes('await fetch(url') && viewer.includes('loader.parse('), "Viewer must inspect downloaded bytes and parse the decoded GLB");
assert.ok(viewer.includes('new DecompressionStream("gzip")'), "Viewer must decompress raw gzip payloads when necessary");
assert.ok(viewer.includes('signature !== "glTF"'), "Viewer must validate the GLB signature before parsing");
assert.ok(viewer.includes('loadGltf("./challenger-1970.glb.gzdata"'), "Viewer must prefer the compressed model");
assert.ok(viewer.includes('loadGltf("./challenger-1970.glb"'), "Production compatibility fallback for the original model is missing");
assert.ok(viewer.includes('Compressed Challenger model unavailable; trying original GLB'), "Compressed model failures must activate the fallback");
assert.ok(headers.includes("connect-src 'self' https: blob:"), "CSP must allow GLTFLoader blob texture fetches");
assert.ok(buildScript.includes("@gltf-transform/cli@4.5.1"), "Build-time glTF texture optimization must be pinned to a known version");
assert.ok(buildScript.includes("'--texture-compress', 'webp'") && buildScript.includes("'--texture-size', '1024'"), "Web-first WebP texture compression and resizing must be enabled");
assert.ok(buildScript.includes("'--flatten', 'false'") && buildScript.includes("'--join', 'false'"), "Optimization must preserve separate model parts for the interactive sidebar");
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
const sourceCompressed = path.join(root, 'client/public/car-explorer/challenger-1970.glb.gzdata');
const distModel = path.join(root, 'client/dist/car-explorer/challenger-1970.glb');
const distOptimized = path.join(root, 'client/dist/car-explorer/challenger-1970.optimized.glb');
const distCompressed = path.join(root, 'client/dist/car-explorer/challenger-1970.glb.gzdata');
assert.ok(existsSync(distCompressed), 'Production build is missing the compressed model asset');
assert.ok(existsSync(distModel), 'Production build must publish the original model as a fallback asset');
assert.ok(!existsSync(distOptimized), 'Temporary optimization intermediate must not be shipped in production');
assert.equal(statSync(distModel).size, modelSize, 'Fallback GLB must match the original source model size');
assert.ok(!existsSync(sourceCompressed), 'Build should clean up its temporary compressed source file');
const compressedSize = statSync(distCompressed).size;
assert.ok(compressedSize < modelSize * 0.75, `Compressed model size is unexpectedly high: ${compressedSize} bytes`);
assert.ok(modelSize > 1_000_000, `Model file unexpectedly small: ${modelSize} bytes`);
assert.ok(boot.includes('window.__carViewerShowError') && boot.includes('retryLoad'), 'Visible error/retry behavior is missing');

console.log('3D viewer audit passed.');
console.log(`Source GLB: ${modelSize.toLocaleString('en-US')} bytes`);
console.log(`Production compressed model: ${compressedSize.toLocaleString('en-US')} bytes (${(100 - compressedSize / modelSize * 100).toFixed(1)}% smaller)`);
console.log('Local module imports, model path, strict CSP, top-level navigation, and retry UI verified.');
