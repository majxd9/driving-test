import { useEffect, useRef } from 'react';
// @ts-ignore Three.js is already a runtime dependency; keep extra type packages out of the client bundle.
import * as THREE from 'three';
import { USDLoader } from 'three/addons/loaders/USDLoader.js';

type Props = { onReady?: () => void; onError?: () => void };

export default function FloatingRobot3D({ onReady, onError }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  onReadyRef.current = onReady;
  onErrorRef.current = onError;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let renderer: any;
    let raf = 0;
    let disposed = false;
    let readyReported = false;
    const geometries = new Set<any>();
    const materials = new Set<any>();
    const addGeometry = (geometry: any) => { geometries.add(geometry); return geometry; };
    const addMaterial = (material: any) => { materials.add(material); return material; };

    try {
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1.15, 1.15, 1.28, -1.28, 0.1, 30);
      camera.position.set(0, 0, 7);
      camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'low-power',
        preserveDrawingBuffer: false,
      });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.15));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;

      scene.add(new THREE.HemisphereLight(0xe3f6ff, 0x243b52, 2.4));
      const key = new THREE.DirectionalLight(0xfff2df, 3.4);
      key.position.set(-3.5, 5.5, 5);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0x68cfff, 2.2);
      fill.position.set(4, 1.5, 3);
      scene.add(fill);
      const rim = new THREE.PointLight(0x41eadc, 1.6, 5);
      rim.position.set(0.1, 0.3, -1.3);
      scene.add(rim);
      const faceGlow = new THREE.PointLight(0x52f5ed, 0.8, 2.5);
      faceGlow.position.set(0, 0.35, 1.2);
      scene.add(faceGlow);

      const silver = addMaterial(new THREE.MeshPhysicalMaterial({
        color: 0xc7dce7, metalness: 0.82, roughness: 0.23, clearcoat: 0.9, clearcoatRoughness: 0.17,
      }));
      const lightSilver = addMaterial(new THREE.MeshPhysicalMaterial({
        color: 0xf0f8ff, metalness: 0.68, roughness: 0.2, clearcoat: 1,
      }));
      const darkMetal = addMaterial(new THREE.MeshStandardMaterial({
        color: 0x334b5d, metalness: 0.82, roughness: 0.28,
      }));
      const visorMat = addMaterial(new THREE.MeshPhysicalMaterial({
        color: 0x061722, metalness: 0.55, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08,
      }));
      const teal = addMaterial(new THREE.MeshStandardMaterial({
        color: 0x5cf5e6, emissive: 0x16bcb1, emissiveIntensity: 1.8, metalness: 0.38, roughness: 0.2,
      }));
      const pupilMat = addMaterial(new THREE.MeshStandardMaterial({
        color: 0x03202d, emissive: 0x061d2b, emissiveIntensity: 0.3, roughness: 0.16,
      }));
      const whiteGlow = addMaterial(new THREE.MeshBasicMaterial({ color: 0xe6ffff }));
      const gold = addMaterial(new THREE.MeshStandardMaterial({
        color: 0xffc36d, emissive: 0xda7c25, emissiveIntensity: 1.25, metalness: 0.35, roughness: 0.24,
      }));
      const sphere = addGeometry(new THREE.SphereGeometry(1, 18, 12));
      const robot = new THREE.Group();
      scene.add(robot);

      // The uploaded model is a static, same-origin asset. Keep the existing
      // lightweight robot as a safe fallback until Lucario finishes loading.
      let lucarioRoot: THREE.Group | null = null;
      let lucarioBaseY = 0;
      const disposeLoadedModel = (object: THREE.Object3D) => {
        const modelGeometries = new Set<THREE.BufferGeometry>();
        const modelMaterials = new Set<THREE.Material>();
        const modelTextures = new Set<THREE.Texture>();
        object.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (mesh.geometry) modelGeometries.add(mesh.geometry);
          const mats = Array.isArray(mesh.material) ? mesh.material : (mesh.material ? [mesh.material] : []);
          for (const material of mats) {
            modelMaterials.add(material);
            for (const value of Object.values(material)) {
              if (value instanceof THREE.Texture) modelTextures.add(value);
            }
          }
        });
        for (const texture of modelTextures) texture.dispose();
        for (const material of modelMaterials) material.dispose();
        for (const geometry of modelGeometries) geometry.dispose();
      };
      const loadLucario = async () => {
        let loaded: THREE.Group | null = null;
        try {
          loaded = await new USDLoader().loadAsync('/car-explorer/Lucario.usdz') as THREE.Group;
          if (disposed) {
            disposeLoadedModel(loaded);
            return;
          }
          const bounds = new THREE.Box3().setFromObject(loaded);
          const size = bounds.getSize(new THREE.Vector3());
          const center = bounds.getCenter(new THREE.Vector3());
          const largestSide = Math.max(size.x, size.y, size.z);
          if (!Number.isFinite(largestSide) || largestSide <= 0) {
            throw new Error('Lucario USDZ has invalid bounds.');
          }

          // Normalize arbitrary authoring units into the same compact helper frame.
          const fitScale = 2.02 / largestSide;
          const normalized = new THREE.Group();
          normalized.scale.setScalar(fitScale);
          normalized.position.set(-center.x * fitScale, -center.y * fitScale, -center.z * fitScale);
          normalized.add(loaded);
          scene.add(normalized);
          lucarioRoot = normalized;
          lucarioBaseY = normalized.position.y;
          robot.visible = false;
        } catch {
          if (loaded && !lucarioRoot) disposeLoadedModel(loaded);
          // A missing/unavailable asset must never disable the existing helper.
        }
      };
      void loadLucario();

      const ball = (parent: any, material: any, scale: [number, number, number], pos: [number, number, number]) => {
        const item = new THREE.Mesh(sphere, material);
        item.scale.set(scale[0], scale[1], scale[2]);
        item.position.set(pos[0], pos[1], pos[2]);
        parent.add(item);
        return item;
      };
      const cylinder = (parent: any, material: any, radiusTop: number, radiusBottom: number, height: number, pos: [number, number, number], segments = 18) => {
        const geometry = addGeometry(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments, 1));
        const item = new THREE.Mesh(geometry, material);
        item.position.set(pos[0], pos[1], pos[2]);
        parent.add(item);
        return item;
      };

      // Feet and articulated legs.
      ball(robot, darkMetal, [0.43, 0.055, 0.2], [0, -0.985, 0.02]);
      const footLeft = ball(robot, silver, [0.17, 0.085, 0.22], [-0.19, -0.935, 0.1]);
      const footRight = ball(robot, silver, [0.17, 0.085, 0.22], [0.19, -0.935, 0.1]);
      footLeft.rotation.y = -0.08;
      footRight.rotation.y = 0.08;
      for (const x of [-0.19, 0.19]) {
        cylinder(robot, darkMetal, 0.075, 0.095, 0.24, [x, -0.79, 0.01], 14);
        ball(robot, lightSilver, [0.105, 0.085, 0.1], [x, -0.68, 0.025]);
        ball(robot, darkMetal, [0.05, 0.05, 0.05], [x, -0.93, 0.18]);
      }

      // Compact armored torso, shoulders, arms, and glowing chest indicator.
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

      // Rounded helmet, glass visor, and independent pupils.
      const head = new THREE.Group();
      head.position.set(0, 0.405, 0.02);
      robot.add(head);
      ball(head, silver, [0.59, 0.465, 0.385], [0, 0, 0]);
      ball(head, lightSilver, [0.11, 0.16, 0.19], [-0.57, 0, 0.01]);
      ball(head, lightSilver, [0.11, 0.16, 0.19], [0.57, 0, 0.01]);
      ball(head, darkMetal, [0.535, 0.325, 0.14], [0, -0.005, 0.31]);
      ball(head, visorMat, [0.505, 0.295, 0.14], [0, -0.002, 0.348]);

      const eyeRefs: Array<{ pupil: any; shine: any; x: number; y: number }> = [];
      for (const x of [-0.235, 0.235]) {
        ball(head, darkMetal, [0.17, 0.155, 0.065], [x, 0.045, 0.435]);
        ball(head, teal, [0.119, 0.115, 0.053], [x, 0.045, 0.474]);
        const pupil = ball(head, pupilMat, [0.057, 0.068, 0.033], [x, 0.045, 0.516]);
        const shine = ball(head, whiteGlow, [0.018, 0.02, 0.012], [x - 0.02, 0.069, 0.543]);
        eyeRefs.push({ pupil, shine, x, y: 0.045 });
      }
      const mouthGeometry = addGeometry(new THREE.BoxGeometry(0.115, 0.022, 0.025));
      const mouth = new THREE.Mesh(mouthGeometry, teal);
      mouth.position.set(0, -0.205, 0.47);
      head.add(mouth);
      cylinder(head, darkMetal, 0.027, 0.035, 0.16, [0, 0.565, 0.005], 12);
      ball(head, gold, [0.075, 0.075, 0.075], [0, 0.655, 0.005]);
      ball(head, whiteGlow, [0.025, 0.025, 0.025], [-0.023, 0.68, 0.05]);

      const pointer = { x: 0, y: 0 };
      const gaze = { x: 0, y: 0 };
      const readPointer = (event: PointerEvent) => {
        pointer.x = Math.max(-1, Math.min(1, (event.clientX / Math.max(window.innerWidth, 1)) * 2 - 1));
        pointer.y = Math.max(-1, Math.min(1, 1 - (event.clientY / Math.max(window.innerHeight, 1)) * 2));
      };
      window.addEventListener('pointermove', readPointer, { passive: true });
      window.addEventListener('pointerdown', readPointer, { passive: true });

      const resize = () => {
        if (disposed) return;
        const rect = canvas.getBoundingClientRect();
        const width = Math.max(84, rect.width || 92);
        const height = Math.max(96, rect.height || 104);
        renderer.setSize(width, height, false);
        const halfHeight = 1.24;
        const halfWidth = halfHeight * width / height;
        camera.left = -halfWidth;
        camera.right = halfWidth;
        camera.top = halfHeight;
        camera.bottom = -halfHeight;
        camera.updateProjectionMatrix();
      };
      const handleContextLost = (event: Event) => {
        event.preventDefault();
        onErrorRef.current?.();
      };
      canvas.addEventListener('webglcontextlost', handleContextLost);
      resize();
      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(canvas);
      }
      window.addEventListener('resize', resize, { passive: true });

      let lastFrameAt = 0;
      const animate = (now: number) => {
        if (disposed || document.hidden) return;
        raf = window.requestAnimationFrame(animate);
        // Cap the tiny helper at 30 FPS to reduce heat and GPU load on phones.
        if (now - lastFrameAt < 33) return;
        lastFrameAt = now;
        gaze.x += (pointer.x - gaze.x) * 0.09;
        gaze.y += (pointer.y - gaze.y) * 0.09;
        robot.position.y = Math.sin(now * 0.0018) * 0.028;
        robot.rotation.y += ((gaze.x * 0.035) - robot.rotation.y) * 0.06;
        head.rotation.y += ((gaze.x * 0.22) - head.rotation.y) * 0.09;
        head.rotation.x += ((-gaze.y * 0.13) - head.rotation.x) * 0.09;
        for (const eye of eyeRefs) {
          eye.pupil.position.x = eye.x + gaze.x * 0.047;
          eye.pupil.position.y = eye.y + gaze.y * 0.031;
          eye.shine.position.x = eye.x - 0.02 + gaze.x * 0.047;
          eye.shine.position.y = eye.y + 0.024 + gaze.y * 0.031;
        }
        if (lucarioRoot) {
          lucarioRoot.position.y = lucarioBaseY + Math.sin(now * 0.0016) * 0.022;
          lucarioRoot.rotation.y += ((gaze.x * 0.11) - lucarioRoot.rotation.y) * 0.055;
          lucarioRoot.rotation.x += ((-gaze.y * 0.045) - lucarioRoot.rotation.x) * 0.055;
        }
        renderer.render(scene, camera);
        if (!readyReported) {
          readyReported = true;
          onReadyRef.current?.();
        }
      };
      const onVisibilityChange = () => {
        if (document.hidden) window.cancelAnimationFrame(raf);
        else if (!disposed) raf = window.requestAnimationFrame(animate);
      };
      document.addEventListener('visibilitychange', onVisibilityChange);
      raf = window.requestAnimationFrame(animate);

      return () => {
        disposed = true;
        window.cancelAnimationFrame(raf);
        window.removeEventListener('pointermove', readPointer);
        window.removeEventListener('pointerdown', readPointer);
        window.removeEventListener('resize', resize);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        canvas.removeEventListener('webglcontextlost', handleContextLost);
        resizeObserver?.disconnect();
        if (lucarioRoot) {
          scene.remove(lucarioRoot);
          disposeLoadedModel(lucarioRoot);
          lucarioRoot = null;
        }
        for (const geometry of geometries) geometry.dispose();
        for (const material of materials) material.dispose();
        geometries.clear();
        materials.clear();
        renderer.dispose();
        renderer.forceContextLoss();
      };
    } catch {
      try { renderer?.dispose(); } catch {}
      onErrorRef.current?.();
      return undefined;
    }
  }, []);

  return <canvas ref={canvasRef} className="rukhsati-robot-canvas" aria-hidden="true" />;
}
