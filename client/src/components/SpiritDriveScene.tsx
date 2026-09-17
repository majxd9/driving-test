import SpiritHorn from './SpiritHorn';
import SpiritLights from './SpiritLights';

export default function SpiritDriveScene({ className = '', large = false }: { className?: string; large?: boolean }) {
  return (
    <div className={`spirit-drive-scene ${large ? 'is-large' : ''} ${className}`} aria-hidden="false">
      <div className="spirit-scene-sky" aria-hidden="true" />
      <div className="spirit-scene-road" aria-hidden="true"><span /></div>
      <div className="spirit-scene-light-beam" aria-hidden="true" />
      <div className="spirit-scene-smoke" aria-hidden="true" />
      <div className="spirit-scene-car" aria-hidden="true" />
      <div className="spirit-scene-reflection" aria-hidden="true" />
      <div className="spirit-scene-controls">
        <SpiritLights />
        <SpiritHorn />
      </div>
    </div>
  );
}
