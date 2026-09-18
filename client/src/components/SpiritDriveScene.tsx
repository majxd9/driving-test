export type SpiritDriveVariant = 'front' | 'rear';

type Props = {
  className?: string;
  large?: boolean;
  variant?: SpiritDriveVariant;
};

export default function SpiritDriveScene({ className = '', large = false, variant = 'front' }: Props) {
  return (
    <div className={`spirit-drive-scene ${large ? 'is-large' : ''} spirit-drive-${variant} ${className}`} aria-hidden="true">
      <div className="spirit-scene-sky" />
      <div className="spirit-scene-road"><span /></div>
      <div className="spirit-scene-light-beam" />
      <div className="spirit-scene-headlight-beams"><i/><i/></div>
      <div className="spirit-scene-smoke" />
      <div className="spirit-scene-car" />
      <div className="spirit-scene-reflection" />
    </div>
  );
}
