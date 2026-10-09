import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Loads the standalone viewer only when opened. The large 3D model is not
 * imported into the React bundle or fetched by the lighting page.
 */
export default function CarExplorer() {
  const navigate = useNavigate();

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'CAR_EXPLORER_CLOSE') navigate('/practical-info');
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [navigate]);

  return (
    <main aria-label="مستكشف السيارة ثلاثي الأبعاد" style={{
      position: 'fixed', inset: 0, width: '100%', height: '100dvh',
      overflow: 'hidden', background: '#0b0d11', zIndex: 200
    }}>
      <iframe
        title="مستكشف Dodge Challenger 1970 ثلاثي الأبعاد"
        src="/car-explorer/index.html"
        allow="fullscreen"
        referrerPolicy="same-origin"
        style={{ display: 'block', width: '100%', height: '100%', border: 0 }}
      />
    </main>
  );
}
