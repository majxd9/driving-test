import { Question } from '../types';

function resolveAiDiagramUrl(src?: string | null): string {
  if (!src) return '';
  const match = src.match(/(?:^|\/)sign_(30[0-6])\.svg$/i);
  return match ? `/signs/sign_${match[1]}.svg` : '';
}

export default function DiagramRenderer({ question }: { question: Question }) {
  if (!question.diagramUrl || !question.diagramType) return null;

  if (question.diagramType === 'interactive') {
    return <div className="diagram-card"><div className="diagram-badge">توضيح تفاعلي</div><p className="font-bold text-ink">{question.diagramTitle || 'توضيح السؤال'}</p><p className="text-sm text-muted mt-1">{question.diagramDescription || 'هذا السؤال يحتوي على توضيح تفاعلي.'}</p></div>;
  }

  const diagramUrl = resolveAiDiagramUrl(question.diagramUrl);
  if (!diagramUrl) return null;

  return <div className="diagram-card">
    <div className="diagram-badge">توضيح بصري</div>
    <div className="w-full h-56 mt-2 flex items-center justify-center overflow-hidden">
      <img
        src={diagramUrl}
        alt={question.diagramTitle || 'توضيح بصري للسؤال'}
        loading="lazy"
        decoding="async"
        className="block w-full h-full object-contain"
      />
    </div>
    {(question.diagramTitle || question.diagramDescription) && <div className="mt-3"><p className="font-bold text-ink">{question.diagramTitle}</p><p className="text-sm text-muted mt-1 leading-relaxed">{question.diagramDescription}</p></div>}
  </div>;
}
