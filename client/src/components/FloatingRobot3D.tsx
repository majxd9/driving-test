import { useEffect, useRef } from 'react';
// @ts-ignore Three.js is an existing runtime dependency; no extra type package is required.
import * as THREE from 'three';

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
    let observer: ResizeObserver | undefined;
    let animationFrame = 0;
    let disposed = false;
    let didReportReady = false;
    let character: any = null;
    let baseY = 0;
    let lastFrameAt = 0;
    const pointer = { x: 0, y: 0 };
    const gaze = { x: 0, y: 0 };

    const disposeModel = (object: any) => {
      if (!object) return;
      const geometries = new Set<any>();
      const materials = new Set<any>();
      const textures = new Set<any>();
      object.traverse((node: any) => {
        if (node.geometry) geometries.add(node.geometry);
        const values = Array.isArray(node.material) ? node.material : (node.material ? [node.material] : []);
        for (const material of values) {
          materials.add(material);
          for (const value of Object.values(material)) {
            if (value instanceof THREE.Texture) textures.add(value);
          }
        }
      });
      for (const texture of textures) texture.dispose();
      for (const material of materials) material.dispose();
      for (const geometry of geometries) geometry.dispose();
    };

    const readPointer = (event: PointerEvent) => {
      pointer.x = Math.max(-1, Math.min(1, event.clientX / Math.max(window.innerWidth, 1) * 2 - 1));
      pointer.y = Math.max(-1, Math.min(1, 1 - event.clientY / Math.max(window.innerHeight, 1) * 2));
    };

    const resize = () => {
      if (disposed || !renderer) return;
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

    let camera: any;
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      onErrorRef.current?.();
    };

    try {
      const scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(-1.15, 1.15, 1.28, -1.28, 0.1, 30);
      camera.position.set(0, 0, 7);
      camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({
        canvas, alpha: true, antialias: true, powerPreference: 'low-power',
        preserveDrawingBuffer: false,
      });
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

      const loadDeli = async () => {
        let loaded: any = null;
        try {
          // Load the shared character model lazily so it does not inflate the initial app bundle.
          // @ts-ignore Three's JavaScript examples loader has no bundled TypeScript declaration.
          const { USDLoader } = await import('three/addons/loaders/USDLoader.js');
          loaded = await new USDLoader().loadAsync('/car-explorer/Zeb.usdz?v=deli-primary-voice-1');
          if (disposed) {
            disposeModel(loaded);
            return;
          }

          const bounds = new THREE.Box3().setFromObject(loaded);
          const size = bounds.getSize(new THREE.Vector3());
          const center = bounds.getCenter(new THREE.Vector3());
          const largestSide = Math.max(size.x, size.y, size.z);
          if (!Number.isFinite(largestSide) || largestSide <= 0) {
            throw new Error('Zeb.usdz has invalid model bounds.');
          }

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
          onErrorRef.current?.();
          console.warn('Deli assistant model could not be loaded; keeping the lightweight non-character placeholder.', error);
        }
      };

      canvas.addEventListener('webglcontextlost', handleContextLost);
      window.addEventListener('pointermove', readPointer, { passive: true });
      window.addEventListener('pointerdown', readPointer, { passive: true });
      window.addEventListener('resize', resize, { passive: true });
      if (typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(resize);
        observer.observe(canvas);
      }
      resize();

      const animate = (now: number) => {
        if (disposed || document.hidden) return;
        animationFrame = window.requestAnimationFrame(animate);
        // Cap the small floating character at 30 FPS to reduce mobile GPU use.
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
        if (character && !didReportReady) {
          didReportReady = true;
          onReadyRef.current?.();
        }
      };

      const onVisibilityChange = () => {
        window.cancelAnimationFrame(animationFrame);
        if (!document.hidden && !disposed) animationFrame = window.requestAnimationFrame(animate);
      };
      document.addEventListener('visibilitychange', onVisibilityChange);
      void loadDeli();
      animationFrame = window.requestAnimationFrame(animate);

      return () => {
        disposed = true;
        window.cancelAnimationFrame(animationFrame);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('pointermove', readPointer);
        window.removeEventListener('pointerdown', readPointer);
        window.removeEventListener('resize', resize);
        canvas.removeEventListener('webglcontextlost', handleContextLost);
        observer?.disconnect();
        if (character) {
          scene.remove(character);
          disposeModel(character);
          character = null;
        }
        try { renderer?.dispose(); } catch {}
      };
    } catch (error) {
      try { renderer?.dispose(); } catch {}
      onErrorRef.current?.();
      console.warn('Deli assistant rendering is unavailable on this device.', error);
    }

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      observer?.disconnect();
      try { renderer?.dispose(); } catch {}
    };
  }, []);

  return <canvas ref={canvasRef} className="rukhsati-robot-canvas" aria-hidden="true" />;
}
