export default function Spinner({ label }: { label?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <div className="w-10 h-10 rounded-full border-[3px] border-line border-t-brand animate-spin" />
      {label && <p className="text-sm text-muted">{label}</p>}
    </div>
  );
}
