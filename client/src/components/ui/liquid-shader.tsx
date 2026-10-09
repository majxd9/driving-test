import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export interface InteractiveNebulaShaderProps {
  hasActiveReminders?: boolean;
  hasUpcomingReminders?: boolean;
  disableCenterDimming?: boolean;
  className?: string;
}

/**
 * Lightweight animated nebula background.
 * The canvas is decorative only and safely degrades when WebGL is unavailable.
 */
export function InteractiveNebulaShader({
  hasActiveReminders = false,
  hasUpcomingReminders = false,
  disableCenterDimming = false,
  className = '',
}: InteractiveNebulaShaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const materialRef = useRef<any>(null);

  useEffect(() => {
    const material = materialRef.current;
    if (!material) return;

    material.uniforms.hasActiveReminders.value = hasActiveReminders;
    material.uniforms.hasUpcomingReminders.value = hasUpcomingReminders;
    material.uniforms.disableCenterDimming.value = disableCenterDimming;
  }, [hasActiveReminders, hasUpcomingReminders, disableCenterDimming]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: any;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: false,
        powerPreference: 'low-power',
      });
    } catch {
      container.dataset.shaderUnavailable = 'true';
      return;
    }

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 0.8);
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(0x071018, 1);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const clock = new THREE.Clock();

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      precision mediump float;
      uniform vec2 iResolution;
      uniform float iTime;
      uniform vec2 iMouse;
      uniform bool hasActiveReminders;
      uniform bool hasUpcomingReminders;
      uniform bool disableCenterDimming;
      varying vec2 vUv;

      #define t iTime
      mat2 m(float a) {
        float c = cos(a), s = sin(a);
        return mat2(c, -s, s, c);
      }

      float map(vec3 p) {
        p.xz *= m(t * 0.4);
        p.xy *= m(t * 0.3);
        vec3 q = p * 2.0 + t;
        return length(p + vec3(sin(t * 0.7))) * log(length(p) + 1.0)
          + sin(q.x + sin(q.z + sin(q.y))) * 0.5 - 1.0;
      }

      void mainImage(out vec4 O, in vec2 fragCoord) {
        vec2 uv = fragCoord / min(iResolution.x, iResolution.y) - vec2(0.9, 0.5);
        uv.x += 0.4;
        vec3 col = vec3(0.0);
        float d = 2.5;

        for (int i = 0; i <= 4; i++) {
          vec3 p = vec3(0.0, 0.0, 5.0) + normalize(vec3(uv, -1.0)) * d;
          float rz = map(p);
          float f = clamp((rz - map(p + 0.1)) * 0.5, -0.1, 1.0);

          vec3 base = hasActiveReminders
            ? vec3(0.05, 0.2, 0.5) + vec3(4.0, 2.0, 5.0) * f
            : hasUpcomingReminders
              ? vec3(0.05, 0.3, 0.1) + vec3(2.0, 5.0, 1.0) * f
              : vec3(0.1, 0.3, 0.4) + vec3(5.0, 2.5, 3.0) * f;

          col = col * base + (1.0 - smoothstep(0.0, 2.5, rz)) * 0.7 * base;
          d += min(rz, 1.0);
        }

        float dist = distance(fragCoord, iResolution * 0.5);
        float radius = min(iResolution.x, iResolution.y) * 0.5;
        float dim = disableCenterDimming
          ? 1.0
          : smoothstep(radius * 0.3, radius * 0.5, dist);

        if (!disableCenterDimming) {
          col = mix(col * 0.3, col, dim);
        }
        O = vec4(col, 1.0);
      }

      void main() {
        mainImage(gl_FragColor, vUv * iResolution);
      }
    `;

    const uniforms: Record<string, { value: any }> = {
      iTime: { value: 0 },
      iResolution: { value: new THREE.Vector2(1, 1) },
      iMouse: { value: new THREE.Vector2() },
      hasActiveReminders: { value: hasActiveReminders },
      hasUpcomingReminders: { value: hasUpcomingReminders },
      disableCenterDimming: { value: disableCenterDimming },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
    });
    materialRef.current = material;

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const resize = () => {
      const width = Math.max(1, container.clientWidth || window.innerWidth);
      const height = Math.max(1, container.clientHeight || window.innerHeight);
      renderer.setSize(width, height, false);
      uniforms.iResolution.value.set(width * pixelRatio, height * pixelRatio);
    };

    const onPointerMove = (event: PointerEvent) => {
      uniforms.iMouse.value.set(
        event.clientX * pixelRatio,
        (window.innerHeight - event.clientY) * pixelRatio,
      );
    };

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let lastRenderTime = 0;

    const renderFrame = () => {
      if (document.hidden) return;
      const elapsed = clock.getElapsedTime();
      if (!reducedMotion && elapsed - lastRenderTime < 1 / 18) return;
      lastRenderTime = elapsed;
      uniforms.iTime.value = reducedMotion ? 0 : elapsed;
      renderer.render(scene, camera);
      if (reducedMotion) renderer.setAnimationLoop(null);
    };

    const onVisibilityChange = () => {
      if (document.hidden || reducedMotion) {
        renderer.setAnimationLoop(null);
      } else {
        renderer.setAnimationLoop(renderFrame);
      }
    };

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(resize)
      : null;

    resizeObserver?.observe(container);
    window.addEventListener('resize', resize, { passive: true });
    container.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);

    resize();
    if (reducedMotion) {
      renderFrame();
    } else {
      renderer.setAnimationLoop(renderFrame);
    }

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resize);
      container.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      renderer.setAnimationLoop(null);
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (materialRef.current === material) materialRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={'fixed inset-0 bg-background ' + className}
      aria-hidden="true"
    />
  );
}

export default InteractiveNebulaShader;
