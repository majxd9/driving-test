import * as THREE from "./vendor/three.module.js";

(() => {
  "use strict";
  const root = document.getElementById("guideAssistant");
  const canvas = document.getElementById("guideRobotCanvas");
  if (!root || !canvas) return;

  let renderer;
  let camera;
  let observer;
  let animationFrame = 0;
  let disposed = false;
  let character = null;
  let baseY = 0;
  let lastFrameAt = 0;
  let ready = false;
  const pointer = { x: 0, y: 0 };
  const gaze = { x: 0, y: 0 };

  const disposeModel = object => {
    if (!object) return;
    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();
    object.traverse(node => {
      if (node.geometry) geometries.add(node.geometry);
      const list = Array.isArray(node.material) ? node.material : (node.material ? [node.material] : []);
      for (const item of list) {
        materials.add(item);
        for (const value of Object.values(item)) if (value && value.isTexture) textures.add(value);
      }
    });
    textures.forEach(value => value.dispose());
    materials.forEach(value => value.dispose());
    geometries.forEach(value => value.dispose());
  };

  const readPointer = event => {
    pointer.x = Math.max(-1, Math.min(1, event.clientX / Math.max(window.innerWidth, 1) * 2 - 1));
    pointer.y = Math.max(-1, Math.min(1, 1 - event.clientY / Math.max(window.innerHeight, 1) * 2));
  };

  const resize = () => {
    if (disposed || !renderer || !camera) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(72, rect.width || 92);
    const height = Math.max(84, rect.height || 104);
    renderer.setSize(width, height, false);
    const halfHeight = 1.24;
    const halfWidth = halfHeight * width / height;
    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
  };

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    window.cancelAnimationFrame(animationFrame);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("pointermove", readPointer);
    window.removeEventListener("pointerdown", readPointer);
    window.removeEventListener("resize", resize);
    canvas.removeEventListener("webglcontextlost", onContextLost);
    observer?.disconnect();
    if (character) {
      scene.remove(character);
      disposeModel(character);
      character = null;
    }
    try { renderer?.dispose(); } catch {}
  };

  let scene;
  const onContextLost = event => {
    event.preventDefault();
    delete root.dataset.robotReady;
  };
  const animate = now => {
    if (disposed || document.hidden) return;
    animationFrame = window.requestAnimationFrame(animate);
    if (now - lastFrameAt < 33) return;
    lastFrameAt = now;
    gaze.x += (pointer.x - gaze.x) * 0.09;
    gaze.y += (pointer.y - gaze.y) * 0.09;
    if (character) {
      character.rotation.y += (gaze.x * 0.24 - character.rotation.y) * 0.07;
      character.rotation.x += (-gaze.y * 0.11 - character.rotation.x) * 0.07;
      character.position.y = baseY + Math.sin(now * 0.0016) * 0.022;
    }
    renderer.render(scene, camera);
    if (character && !ready) {
      ready = true;
      root.dataset.robotReady = "true";
    }
  };
  const onVisibilityChange = () => {
    window.cancelAnimationFrame(animationFrame);
    if (!document.hidden && !disposed) animationFrame = window.requestAnimationFrame(animate);
  };

  try {
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1.15, 1.15, 1.28, -1.28, 0.1, 30);
    camera.position.set(0, 0, 7);
    camera.lookAt(0, 0, 0);
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;

    scene.add(new THREE.HemisphereLight(0xe3f6ff, 0x243b52, 2.5));
    const key = new THREE.DirectionalLight(0xfff2df, 3.2);
    key.position.set(-3.5, 5.5, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x68cfff, 2.1);
    fill.position.set(4, 1.5, 3);
    scene.add(fill);
    const rim = new THREE.PointLight(0x41eadc, 1.5, 5);
    rim.position.set(0.1, 0.3, -1.3);
    scene.add(rim);

    canvas.addEventListener("webglcontextlost", onContextLost);
    window.addEventListener("pointermove", readPointer, { passive: true });
    window.addEventListener("pointerdown", readPointer, { passive: true });
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", cleanup, { once: true });
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(resize);
      observer.observe(canvas);
    }
    resize();

    const loadDeli = async () => {
      let loaded = null;
      try {
        const { USDLoader } = await import("./guide-usdz-loader.js?v=20261010-r8");
        loaded = await new USDLoader().loadAsync("./Zeb.usdz?v=deli-primary-voice-1");
        if (disposed) {
          disposeModel(loaded);
          return;
        }
        const bounds = new THREE.Box3().setFromObject(loaded);
        const size = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());
        const largestSide = Math.max(size.x, size.y, size.z);
        if (!Number.isFinite(largestSide) || largestSide <= 0) throw new Error("Zeb.usdz has invalid model bounds.");

        const fitScale = 2.02 / largestSide;
        const normalized = new THREE.Group();
        normalized.scale.setScalar(fitScale);
        normalized.position.set(-center.x * fitScale, -center.y * fitScale, -center.z * fitScale);
        normalized.add(loaded);
        scene.add(normalized);
        character = normalized;
        baseY = normalized.position.y;
      } catch (error) {
        if (loaded && !character) disposeModel(loaded);
        delete root.dataset.robotReady;
        console.warn("Deli guide model unavailable; using the neutral placeholder.", error);
      }
    };

    void loadDeli();
    animationFrame = window.requestAnimationFrame(animate);
  } catch (error) {
    delete root.dataset.robotReady;
    try { renderer?.dispose(); } catch {}
    console.warn("Deli guide rendering is unavailable; using the neutral placeholder.", error);
  }
})();