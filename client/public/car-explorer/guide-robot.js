import * as THREE from "./vendor/three.module.js";

(() => {
  "use strict";
  const root = document.getElementById("guideAssistant");
  const canvas = document.getElementById("guideRobotCanvas");
  if (!root || !canvas) return;

  let renderer;
  let raf = 0;
  let disposed = false;
  const geometrySet = new Set();
  const materialSet = new Set();
  const geometry = (value) => { geometrySet.add(value); return value; };
  const material = (value) => { materialSet.add(value); return value; };

  try {
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1.15, 1.15, 1.28, -1.28, 0.1, 30);
    camera.position.set(0, 0, 7);
    camera.lookAt(0, 0, 0);
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.15));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;

    scene.add(new THREE.HemisphereLight(0xe3f6ff, 0x243b52, 2.4));
    const key = new THREE.DirectionalLight(0xfff2df, 3.4); key.position.set(-3.5, 5.5, 5); scene.add(key);
    const fill = new THREE.DirectionalLight(0x68cfff, 2.2); fill.position.set(4, 1.5, 3); scene.add(fill);
    const rim = new THREE.PointLight(0x41eadc, 1.6, 5); rim.position.set(0.1, 0.3, -1.3); scene.add(rim);
    const faceGlow = new THREE.PointLight(0x52f5ed, 0.8, 2.5); faceGlow.position.set(0, 0.35, 1.2); scene.add(faceGlow);

    const silver = material(new THREE.MeshPhysicalMaterial({ color: 0xc7dce7, metalness: 0.82, roughness: 0.23, clearcoat: 0.9, clearcoatRoughness: 0.17 }));
    const lightSilver = material(new THREE.MeshPhysicalMaterial({ color: 0xf0f8ff, metalness: 0.68, roughness: 0.2, clearcoat: 1 }));
    const darkMetal = material(new THREE.MeshStandardMaterial({ color: 0x334b5d, metalness: 0.82, roughness: 0.28 }));
    const visorMat = material(new THREE.MeshPhysicalMaterial({ color: 0x061722, metalness: 0.55, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08 }));
    const teal = material(new THREE.MeshStandardMaterial({ color: 0x5cf5e6, emissive: 0x16bcb1, emissiveIntensity: 1.8, metalness: 0.38, roughness: 0.2 }));
    const pupilMat = material(new THREE.MeshStandardMaterial({ color: 0x03202d, emissive: 0x061d2b, emissiveIntensity: 0.3, roughness: 0.16 }));
    const whiteGlow = material(new THREE.MeshBasicMaterial({ color: 0xe6ffff }));
    const gold = material(new THREE.MeshStandardMaterial({ color: 0xffc36d, emissive: 0xda7c25, emissiveIntensity: 1.25, metalness: 0.35, roughness: 0.24 }));
    const sphere = geometry(new THREE.SphereGeometry(1, 18, 12));
    const robot = new THREE.Group(); scene.add(robot);

    const ball = (parent, mat, scale, pos) => {
      const item = new THREE.Mesh(sphere, mat);
      item.scale.set(scale[0], scale[1], scale[2]);
      item.position.set(pos[0], pos[1], pos[2]);
      parent.add(item);
      return item;
    };
    const cylinder = (parent, mat, top, bottom, height, pos, segments = 18) => {
      const item = new THREE.Mesh(geometry(new THREE.CylinderGeometry(top, bottom, height, segments, 1)), mat);
      item.position.set(pos[0], pos[1], pos[2]); parent.add(item); return item;
    };

    ball(robot, darkMetal, [0.43, 0.055, 0.2], [0, -0.985, 0.02]);
    const footLeft = ball(robot, silver, [0.17, 0.085, 0.22], [-0.19, -0.935, 0.1]);
    const footRight = ball(robot, silver, [0.17, 0.085, 0.22], [0.19, -0.935, 0.1]);
    footLeft.rotation.y = -0.08; footRight.rotation.y = 0.08;
    for (const x of [-0.19, 0.19]) {
      cylinder(robot, darkMetal, 0.075, 0.095, 0.24, [x, -0.79, 0.01], 14);
      ball(robot, lightSilver, [0.105, 0.085, 0.1], [x, -0.68, 0.025]);
      ball(robot, darkMetal, [0.05, 0.05, 0.05], [x, -0.93, 0.18]);
    }
    ball(robot, silver, [0.43, 0.46, 0.31], [0, -0.455, 0]);
    ball(robot, darkMetal, [0.31, 0.23, 0.305], [0, -0.59, 0.025]);
    cylinder(robot, lightSilver, 0.105, 0.12, 0.16, [0, -0.065, 0], 20);
    for (const side of [-1, 1]) {
      ball(robot, lightSilver, [0.125, 0.13, 0.13], [side * 0.405, -0.245, 0]);
      const arm = cylinder(robot, silver, 0.078, 0.09, 0.32, [side * 0.49, -0.445, 0.025], 16);
      arm.rotation.z = side * -0.16;
      ball(robot, darkMetal, [0.082, 0.085, 0.085], [side * 0.51, -0.64, 0.06]);
      ball(robot, lightSilver, [0.085, 0.07, 0.085], [side * 0.52, -0.68, 0.07]);
    }
    ball(robot, darkMetal, [0.19, 0.22, 0.07], [0, -0.45, 0.281]);
    ball(robot, teal, [0.064, 0.064, 0.032], [0, -0.45, 0.34]);
    ball(robot, whiteGlow, [0.018, 0.018, 0.012], [-0.018, -0.427, 0.368]);

    const head = new THREE.Group(); head.position.set(0, 0.405, 0.02); robot.add(head);
    ball(head, silver, [0.59, 0.465, 0.385], [0, 0, 0]);
    ball(head, lightSilver, [0.11, 0.16, 0.19], [-0.57, 0, 0.01]);
    ball(head, lightSilver, [0.11, 0.16, 0.19], [0.57, 0, 0.01]);
    ball(head, darkMetal, [0.535, 0.325, 0.14], [0, -0.005, 0.31]);
    ball(head, visorMat, [0.505, 0.295, 0.14], [0, -0.002, 0.348]);

    const eyes = [];
    for (const x of [-0.235, 0.235]) {
      ball(head, darkMetal, [0.17, 0.155, 0.065], [x, 0.045, 0.435]);
      ball(head, teal, [0.119, 0.115, 0.053], [x, 0.045, 0.474]);
      const pupil = ball(head, pupilMat, [0.057, 0.068, 0.033], [x, 0.045, 0.516]);
      const shine = ball(head, whiteGlow, [0.018, 0.02, 0.012], [x - 0.02, 0.069, 0.543]);
      eyes.push({ pupil, shine, x, y: 0.045 });
    }
    const mouth = new THREE.Mesh(geometry(new THREE.BoxGeometry(0.115, 0.022, 0.025)), teal);
    mouth.position.set(0, -0.205, 0.47); head.add(mouth);
    cylinder(head, darkMetal, 0.027, 0.035, 0.16, [0, 0.565, 0.005], 12);
    ball(head, gold, [0.075, 0.075, 0.075], [0, 0.655, 0.005]);
    ball(head, whiteGlow, [0.025, 0.025, 0.025], [-0.023, 0.68, 0.05]);

    const pointer = { x: 0, y: 0 }, gaze = { x: 0, y: 0 };
    const readPointer = (event) => {
      pointer.x = Math.max(-1, Math.min(1, (event.clientX / Math.max(window.innerWidth, 1)) * 2 - 1));
      pointer.y = Math.max(-1, Math.min(1, 1 - (event.clientY / Math.max(window.innerHeight, 1)) * 2));
    };
    window.addEventListener("pointermove", readPointer, { passive: true });
    window.addEventListener("pointerdown", readPointer, { passive: true });

    const resize = () => {
      if (disposed) return;
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(84, rect.width || 92), height = Math.max(96, rect.height || 104);
      renderer.setSize(width, height, false);
      const halfHeight = 1.24, halfWidth = halfHeight * width / height;
      camera.left = -halfWidth; camera.right = halfWidth;
      camera.top = halfHeight; camera.bottom = -halfHeight;
      camera.updateProjectionMatrix();
    };
    resize();
    let observer = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(resize);
      observer.observe(canvas);
    }
    window.addEventListener("resize", resize, { passive: true });

    let lastFrameAt = 0;
    const animate = (now) => {
      if (disposed || document.hidden) return;
      raf = window.requestAnimationFrame(animate);
      if (now - lastFrameAt < 33) return;
      lastFrameAt = now;
      gaze.x += (pointer.x - gaze.x) * 0.09;
      gaze.y += (pointer.y - gaze.y) * 0.09;
      robot.position.y = Math.sin(now * 0.0018) * 0.028;
      robot.rotation.y += ((gaze.x * 0.035) - robot.rotation.y) * 0.06;
      head.rotation.y += ((gaze.x * 0.22) - head.rotation.y) * 0.09;
      head.rotation.x += ((-gaze.y * 0.13) - head.rotation.x) * 0.09;
      for (const eye of eyes) {
        eye.pupil.position.x = eye.x + gaze.x * 0.047;
        eye.pupil.position.y = eye.y + gaze.y * 0.031;
        eye.shine.position.x = eye.x - 0.02 + gaze.x * 0.047;
        eye.shine.position.y = eye.y + 0.024 + gaze.y * 0.031;
      }
      renderer.render(scene, camera);
      root.dataset.robotReady = "true";
    };
    const onVisibilityChange = () => {
      if (document.hidden) window.cancelAnimationFrame(raf);
      else if (!disposed) raf = window.requestAnimationFrame(animate);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    raf = window.requestAnimationFrame(animate);

    const showFallback = () => { delete root.dataset.robotReady; };
    canvas.addEventListener("webglcontextlost", showFallback);

    window.addEventListener("pagehide", () => {
      disposed = true; window.cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", readPointer);
      window.removeEventListener("pointerdown", readPointer);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      observer?.disconnect();
      for (const entry of geometrySet) entry.dispose();
      for (const entry of materialSet) entry.dispose();
      geometrySet.clear();
      materialSet.clear();
      renderer.dispose();
    }, { once: true });
  } catch (error) {
    try { renderer?.dispose(); } catch {}
    delete root.dataset.robotReady;
    console.warn("3D guide robot unavailable; showing the lightweight fallback.", error);
  }

  // Keep the fallback's eyes lively too, in case WebGL is unavailable on this device.
  const moveFallbackEyes = (event) => {
    const x = Math.max(-3, Math.min(3, (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 6));
    const y = Math.max(-3, Math.min(3, (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 6));
    root.querySelectorAll(".guide-robot-eye").forEach((eye) => {
      eye.style.setProperty("translate", x + "px " + y + "px");
    });
  };
  window.addEventListener("pointermove", moveFallbackEyes, { passive: true });
  window.addEventListener("pointerdown", moveFallbackEyes, { passive: true });
})();
