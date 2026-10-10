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
  'client/public/car-explorer/guide-robot.js',
  'client/src/components/FloatingSiteAssistant.tsx',
  'client/src/components/FloatingRobot3D.tsx',
  'client/src/components/floating-site-assistant.css',
  'client/vite.usdz-loader.config.ts',
  'server/Services/SystemAudioCatalog.cs',
  'server/Services/SystemAudioPromptService.cs',
  'server/Controllers/QuestionsController.cs',
  'server/Services/FishAudioQuestionAudioGenerator.cs',
  'client/public/car-explorer/vendor/three.module.js',
  'client/public/car-explorer/vendor/OrbitControls.js',
  'client/public/car-explorer/vendor/GLTFLoader.js',
  'client/public/car-explorer/vendor/BufferGeometryUtils.js',
  'client/public/car-explorer/vendor/THREE-LICENSE.txt',
  'client/public/car-explorer/challenger-1970.glb',
  'client/public/car-explorer/mclaren-senna-gtr-low.glb.gz',
  'client/public/car-explorer/mclaren-senna-gtr-medium.glb.gz',
  'client/public/car-explorer/mclaren-senna-gtr-high.glb.gz',
];
for (const file of required) assert.ok(existsSync(path.join(root, file)), `Missing file: ${file}`);

const syntaxCheck = spawnSync(process.execPath, ['--check', path.join(root, 'client/public/car-explorer/viewer.js')], { encoding: 'utf8' });
assert.equal(syntaxCheck.status, 0, 'Car viewer JavaScript syntax check failed: ' + (syntaxCheck.stderr || syntaxCheck.stdout || 'unknown error'));
const guideSyntaxCheck = spawnSync(process.execPath, ['--check', path.join(root, 'client/public/car-explorer/guide-assistant.js')], { encoding: 'utf8' });
assert.equal(guideSyntaxCheck.status, 0, 'Car guide assistant JavaScript syntax check failed: ' + (guideSyntaxCheck.stderr || guideSyntaxCheck.stdout || 'unknown error'));
const guideRobotSyntaxCheck = spawnSync(process.execPath, ['--check', path.join(root, 'client/public/car-explorer/guide-robot.js')], { encoding: 'utf8' });
assert.equal(guideRobotSyntaxCheck.status, 0, '3D guide robot JavaScript syntax check failed: ' + (guideRobotSyntaxCheck.stderr || guideRobotSyntaxCheck.stdout || 'unknown error'));
const html = read('client/public/car-explorer/index.html');
const viewer = read('client/public/car-explorer/viewer.js');
const guideAssistant = read('client/public/car-explorer/guide-assistant.js');
const guideAssistantCss = read('client/public/car-explorer/guide-assistant.css');
const guideRobot = read('client/public/car-explorer/guide-robot.js');
const floatingAssistant = read('client/src/components/FloatingSiteAssistant.tsx');
const floatingRobot3D = read('client/src/components/FloatingRobot3D.tsx');
const floatingAssistantCss = read('client/src/components/floating-site-assistant.css');
const systemAudioCatalog = read('server/Services/SystemAudioCatalog.cs');
const systemAudioPrompts = read('server/Services/SystemAudioPromptService.cs');
const questionsController = read('server/Controllers/QuestionsController.cs');
const study = read('client/src/pages/Study.tsx');
const fishAudioGenerator = read('server/Services/FishAudioQuestionAudioGenerator.cs');
const systemAudioGeneratorInterfaces = read('server/Services/IQuestionAiGenerators.cs');
const serverProgram = read('server/Program.cs');
const premiumCss = read('client/public/car-explorer/viewer-premium.css');
const buildScript = read('scripts/build-client.mjs');
const usdzLoaderConfig = read('client/vite.usdz-loader.config.ts');
const boot = read('client/public/car-explorer/viewer-boot.js');
const orbit = read('client/public/car-explorer/vendor/OrbitControls.js');
const gltf = read('client/public/car-explorer/vendor/GLTFLoader.js');
const buffer = read('client/public/car-explorer/vendor/BufferGeometryUtils.js');
const headers = read('client/public/_headers');
const appPage = read('client/src/pages/CarExplorer.tsx');
const carExplorer = appPage;
const redirects = read('client/public/_redirects');

assert.ok(!/<script\b(?![^>]*\bsrc\s*=)[^>]*>/i.test(html), 'Inline script found; this site CSP blocks inline scripts');
assert.ok(!html.includes('type="importmap"'), 'Inline import map found; viewer should not need an import map');
assert.ok(html.includes('src="./viewer-boot.js?v=20261010-r8"'), 'Versioned viewer boot/error handler is not linked');
assert.ok(html.includes('type="module" src="./viewer.js?v=20261010-r8"'), 'Versioned viewer module is not linked');
assert.ok(html.includes('href="./viewer-premium.css?v=20261010-r8"'), 'Versioned premium viewer CSS is not linked');
assert.ok(html.includes('href="./guide-assistant.css?v=20261010-deli4"'), 'Versioned Deli assistant CSS is not linked');
assert.ok(html.includes('src="./guide-assistant.js?v=20261010-deli4"'), 'Versioned Deli assistant script is not linked');
assert.ok(html.includes('<div class="guide-assistant" id="guideAssistant">'), 'Deli car-viewer assistant must be visible by default and hidden only for admin sessions');
assert.ok(html.includes('<button type="button" class="guide-assistant-toggle" id="guideAssistantToggle"'), 'Direct-speech robot button is missing');
assert.ok(html.includes('id="guideRobotCanvas"') && html.includes('guide-robot.js?v=20261010-deli4'), 'Actual Zeb 3D canvas/module is missing');
assert.ok(html.includes('id="guideAssistantSuggestion"') && html.includes('type="button" class="guide-assistant-toggle"') && !html.includes('guideAssistantSpeak') && !html.includes('guideAssistantPanel') && !html.includes('data-guide-topic='), 'Standalone assistant must have only a non-interactive page hint and a direct-speech robot, with no popup/button panel');
assert.ok(guideRobot.includes('new THREE.WebGLRenderer') && guideRobot.includes('window.addEventListener("pointermove", readPointer'), 'The assistant must be a real Three.js robot that tracks the pointer');
assert.ok(guideRobot.includes('gaze.x * 0.24') && guideRobot.includes('gaze.y * 0.11'), 'Zeb 3D character does not smoothly follow pointer/touch movement');
assert.ok(guideRobot.includes('capture: true') && guideRobot.includes('touchstart') && guideRobot.includes('touchmove') && guideRobot.includes('collectEyeTargets'), '3D assistant must capture finger taps and discover eye targets even if USDZ names are flattened');
assert.ok(guideRobot.includes('lastFrameAt') && guideRobot.includes('now - lastFrameAt < 33') && !guideRobot.includes('root.dataset.robotReady = "true";\n\n    const showFallback'), 'Standalone robot should limit rendering to 30 FPS and only reveal after the first frame');
assert.ok(guideAssistantCss.includes('.guide-assistant[data-robot-ready="true"] .guide-robot-stage{display:none}'), 'CSS fallback must yield to the rendered 3D robot');
assert.ok(floatingAssistant.includes('import FloatingRobot3D') && floatingAssistant.includes("location.pathname.startsWith('/admin')") && !floatingAssistant.includes('useAuth'), 'Main-site assistant must be visible on every non-admin route');
assert.ok(floatingRobot3D.includes('new THREE.WebGLRenderer') && floatingRobot3D.includes("window.addEventListener('pointermove', readPointer") && floatingRobot3D.includes("window.addEventListener('pointerdown', readPointer"), 'Main-site helper must render an actual Three.js model and track mouse/touch');
assert.ok(floatingRobot3D.includes("await import('three/addons/loaders/USDLoader.js')") && floatingRobot3D.includes("'/car-explorer/Zeb.usdz?v=deli-primary-voice-1'") && !floatingRobot3D.includes('Lucario.usdz'), 'Main assistant must load Zeb USDZ and remove the legacy character');
assert.ok(guideRobot.includes('import("./guide-usdz-loader.js?v=20261010-r8")') && guideRobot.includes('loadAsync("./Zeb.usdz?v=deli-primary-voice-1")') && !guideRobot.includes('Lucario.usdz'), 'Standalone assistant must load the Zeb model and remove legacy character references');
assert.ok(usdzLoaderConfig.includes('node_modules/three/examples/jsm/loaders/USDLoader.js') && usdzLoaderConfig.includes("./vendor/three.module.js"), 'Standalone USDZ loader must bundle locally and avoid a CDN');
assert.ok(buildScript.includes("'vite.usdz-loader.config.ts'") && buildScript.includes('guide-usdz-loader.js'), 'Production build must generate the standalone USDZ loader before copying public assets');
assert.ok(floatingRobot3D.includes('gaze.x * 0.24') && floatingRobot3D.includes('gaze.y * 0.11'), 'Main-site Zeb character must smoothly track the pointer');
assert.ok(floatingAssistantCss.includes('.rukhsati-site-assistant[data-robot-ready="true"] .rukhsati-robot-stage{display:none}'), 'Main-site CSS fallback must yield to the rendered 3D robot');
assert.ok(floatingRobot3D.includes('lastFrameAt') && floatingRobot3D.includes('now - lastFrameAt < 33') && floatingRobot3D.includes('onVisibilityChange'), 'Main site robot should limit redraws and resume safely when a tab becomes visible');
assert.ok(guideAssistantCss.includes('.guide-assistant-suggestion{') && guideAssistantCss.includes('pointer-events:none'), 'Standalone page hint must not intercept clicks or act like a play button');
assert.ok(guideAssistant.includes('toggle.addEventListener("click"') && guideAssistant.includes('speakOnRobotClick()') && guideAssistant.includes('window.speechSynthesis.speak(utterance)') && guideAssistant.includes('root.dataset.initialized = "true"'), 'Clicking the standalone robot must start speech directly without opening a disclosure');
assert.ok(guideAssistant.includes('item.dragging = true') && guideAssistant.includes('}, 450)'), 'Robot movement must activate only after a long press');
assert.ok(!guideAssistant.includes('position.x + dx * 46'), 'Zeb must not dodge unrelated page taps');
assert.ok(floatingAssistant.includes('setShowSuggestion(true)') && floatingAssistant.includes('topicForPath(location.pathname)') && floatingAssistant.includes('450') && floatingAssistant.includes('setShowSuggestion(false)'), 'Main SPA must show brief page-aware suggestions and support intentional dragging');
assert.ok(!floatingAssistant.includes('rukhsati-assistant-topics') && !floatingAssistant.includes('اسمع الشرح') && !floatingAssistant.includes('rukhsati-assistant-panel') && floatingAssistant.includes('onClick={handleRobotClick}') && floatingAssistant.includes('window.speechSynthesis.speak(utterance)'), 'Main SPA robot must speak directly on click without a popup or separate speech button');
assert.ok(html.includes('meta name="api-base-url"'), 'The guide assistant API base URL is missing');
assert.ok(!/guideAssistantAudio[^>]*autoplay/i.test(html), 'The guide assistant must not autoplay audio');
assert.ok(guideAssistant.includes('root.hidden = false;') && !guideAssistant.includes('session?.role === "Admin"') && !guideAssistant.includes('session?.role === "admin"'), 'Car-viewer assistant must stay visible in the 3D explorer for every session');
assert.ok(guideAssistant.includes('/api/questions/audio-prompt/" + encodeURIComponent(audioKey)') && guideAssistant.includes('speechSynthesis') && guideAssistant.includes('speakWithDeviceVoice(text)'), 'Standalone Deli must prefer cached AI audio for the selected part and fall back to Arabic device speech');
assert.ok(guideAssistantCss.includes('@media(max-width:480px)') && guideAssistantCss.includes('prefers-reduced-motion:reduce'), 'Guide assistant responsive/reduced-motion styles are missing');
assert.ok(headers.includes('/car-explorer/guide-robot.js\n  Cache-Control: no-cache'), '3D robot module must revalidate in normal desktop browsers');
assert.ok(systemAudioCatalog.includes('CarGuideWelcome') && systemAudioCatalog.includes('CarGuideQuality'), 'Guide audio keys are not registered in the backend');
assert.ok(systemAudioPrompts.includes('CarGuideWelcome =>') && systemAudioPrompts.includes('Optional car-guide audio generation failed') && !systemAudioPrompts.includes('SiteGuideWelcome =>'), 'Keep existing question/car audio separate from the floating robot voice');
assert.ok(systemAudioGeneratorInterfaces.includes('interface ITextToSpeechGenerator'), 'Configured system-text speech interface is missing');
assert.ok(serverProgram.includes('AddScoped<ITextToSpeechGenerator>') && systemAudioPrompts.includes('QUESTION_AUDIO_PROVIDER'), 'System guide audio must follow the configured audio provider');
assert.ok(systemAudioPrompts.includes('existing ElevenLabs/Eden AI fallback'), 'Guide audio provider fallback is missing');
assert.ok(floatingAssistant.includes('resolveApiUrl') && floatingAssistant.includes('site-assistant-${activeTopic.id}') && floatingAssistant.includes('audio.play()'), 'Main assistant must prefer cached AI speech after a direct click and keep a device-voice fallback');
assert.ok(systemAudioCatalog.includes('IsSiteAssistantKey') && systemAudioCatalog.includes('SiteAssistantWelcome'), 'Dedicated site-assistant audio keys must stay separate in the catalog');
assert.ok(systemAudioPrompts.includes('FISH_AUDIO_SITE_ASSISTANT_VOICE_ID') && systemAudioPrompts.includes('DefaultSiteAssistantVoiceId'), 'Site-assistant voice ID must have a separate configuration setting');
assert.ok(systemAudioPrompts.includes('_fishAudioGenerator.GenerateTextAsync(text, voiceId, cancellationToken)') && systemAudioPrompts.includes('deli-assistant-audio-v2|provider=fish'), 'Deli system and explanation narration must use Fish Audio with a stable, versioned cache hash');
assert.ok(study.includes('rukhsati-assistant-context') && study.includes('/api/questions/${question.id}/explanation-audio'), 'Training must pass an answered question explanation and its audio URL to Deli');
assert.ok(systemAudioPrompts.includes('GetOrCreateQuestionExplanationAudioAsync') && systemAudioPrompts.includes('deli-question-explanation-audio-v2') && systemAudioPrompts.includes('SystemAudios') && !systemAudioPrompts.includes('questionsWithExplanations'), 'Explanation audio must be generated on demand, versioned, and persisted instead of spending Fish Audio quota during every cold start');
assert.ok(questionsController.includes('GetQuestionExplanationAudio') && questionsController.includes('GetOrCreateQuestionExplanationAudioAsync'), 'Students must be able to retrieve a cached explanation clip or create it once on first playback');
assert.ok(viewer.includes('rukhsati-car-part-selected') && viewer.includes('selectedPartDescription') && viewer.includes('audioKey:"car-guide-part-engine"'), 'Selecting any modeled car part must show and publish its function for Deli');
assert.ok(guideAssistant.includes('handleCarPartSelected') && guideAssistant.includes('speakText(currentSpeech.text, currentSpeech.audioKey)') && guideAssistant.includes('lastDodgeAt'), 'Car-viewer Deli must speak the selected part and glide away from nearby taps');
assert.ok(floatingAssistant.includes('rukhsati-assistant-context') && floatingAssistant.includes('speechContext?.audioUrl') && floatingAssistant.includes('handleNearbyPress'), 'Main-site Deli must read current answer explanations and smoothly dodge nearby taps');
assert.ok(!html.includes('id="guideAssistant" hidden') && html.includes('id="selectedPartDescription"'), 'Deli and the part-function description must be visible by default in the 3D viewer');
assert.ok(fishAudioGenerator.includes('voiceIdOverride') && fishAudioGenerator.includes('FISH_AUDIO_VOICE_ID') && fishAudioGenerator.includes('GenerateTextAsync(text, cancellationToken, voiceId)'), 'Fish Audio must honor explicit prompt voice IDs without replacing the question voice');
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
assert.ok(!html.includes('value="mustang"') && !viewer.includes('mustang-2005.glb') && !html.includes('id="modelAttribution"'), 'Removed vehicle and attribution must not remain in the production viewer');
assert.ok(viewer.includes('let currentQuality = "medium"'), 'Medium graphics quality must be the default');
assert.ok(viewer.includes('urlForQuality') && viewer.includes('mclaren-senna-gtr-') && viewer.includes('20261010-r6'), 'Versioned McLaren quality-specific assets are not wired');
assert.ok(viewer.includes('const qualities = [...new Set([requestedQuality, "low", "medium", "high"])]'), 'McLaren must retry the other quality variants');
assert.ok(viewer.includes('if (vehicleId === "mclaren") {\n   setLoadError'), 'McLaren failure must be reported instead of silently swapping the car');
assert.ok(headers.includes('/car-explorer/index.html\n  Cache-Control: no-cache') && headers.includes('/car-explorer/viewer.js\n  Cache-Control: no-cache'), 'Car viewer HTML/JS must revalidate in normal desktop browsers');
assert.ok(carExplorer.includes('build=20261010-r9'), 'SPA car viewer route must use a fresh URL');
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
assert.ok(appPage.includes("window.location.replace('/car-explorer/index.html?build=20261010-r9')"), 'React route must open the versioned standalone document');
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

const zebAsset = path.join(root, 'client/public/car-explorer/Zeb.usdz');
if (!existsSync(zebAsset)) {
  console.warn('Zeb.usdz is not in the repository yet; the assistant will use its unobtrusive Z placeholder until the model file is added.');
} else {
  const signature = readFileSync(zebAsset).subarray(0, 2).toString('ascii');
  assert.equal(signature, 'PK', 'Zeb.usdz does not look like a USDZ/ZIP package.');
  assert.ok(statSync(zebAsset).size > 1000, 'Zeb.usdz is unexpectedly small.');
}
console.log('3D viewer audit passed.');
console.log(`Source GLB: ${modelSize.toLocaleString('en-US')} bytes`);
console.log(`Production compressed model: ${compressedSize.toLocaleString('en-US')} bytes (${(100 - compressedSize / modelSize * 100).toFixed(1)}% smaller)`);
console.log('Local module imports, model path, strict CSP, top-level navigation, and retry UI verified.');
