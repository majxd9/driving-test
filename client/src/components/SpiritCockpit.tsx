import { useLocation } from 'react-router-dom';
import SpiritLights from './SpiritLights';

export default function SpiritCockpit() {
  const { pathname } = useLocation();

  // Home and login already contain their own dedicated controls/scenes.
  if (pathname === '/' || pathname === '/login') return null;

  return (
    <aside className="spirit-global-cockpit" aria-label="تحكم هوية رخصتي">
      <div className="spirit-global-road" aria-hidden="true" />
      <div className="spirit-global-car" aria-hidden="true" />
      <div className="spirit-global-smoke" aria-hidden="true" />
      <SpiritLights className="spirit-global-lights" />
    </aside>
  );
}
