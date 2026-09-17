import { useLocation } from 'react-router-dom';
import SpiritLights from './SpiritLights';
import SpiritHorn from './SpiritHorn';

export default function SpiritCockpit() {
  const { pathname } = useLocation();

  // Home, login and models contain their own dedicated driving scenes/controls.
  if (pathname === '/' || pathname === '/login' || pathname === '/models') return null;

  return (
    <aside className="spirit-global-cockpit" aria-label="تحكم هوية رخصتي">
      <div className="spirit-global-road" aria-hidden="true" />
      <div className="spirit-global-car" aria-hidden="true" />
      <div className="spirit-global-smoke" aria-hidden="true" />
      <div className="spirit-global-controls">
        <SpiritLights compact className="spirit-global-lights" />
        <SpiritHorn />
      </div>
    </aside>
  );
}
