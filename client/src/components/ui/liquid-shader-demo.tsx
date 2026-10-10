import { lazy, Suspense } from 'react';

const InteractiveNebulaShader = lazy(() => import('./liquid-shader'));

/** Reusable demo/integration wrapper for InteractiveNebulaShader. */
export default function LiquidShaderDemo({ className = '' }: { className?: string }) {
  return (
    <Suspense fallback={null}>
      <InteractiveNebulaShader className={className} />
    </Suspense>
  );
}
