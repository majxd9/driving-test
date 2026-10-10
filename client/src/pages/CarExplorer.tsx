import { useEffect } from 'react';

/**
 * The standalone viewer is intentionally opened as a top-level document.
 * This keeps the site's strict frame-ancestors 'none' / X-Frame-Options: DENY
 * protection intact instead of embedding a page that those protections block.
 */
export default function CarExplorer() {
  useEffect(() => {
    window.location.replace('/car-explorer/index.html?build=20261010-r6');
  }, []);

  return (
    <main role="status" aria-live="polite" style={{
      position: 'fixed', inset: 0, display: 'grid', placeItems: 'center',
      background: '#0b0d11', color: '#f1f3f7', fontFamily: 'system-ui, sans-serif'
    }}>
      جارٍ فتح مستكشف السيارة ثلاثي الأبعاد…
    </main>
  );
}
