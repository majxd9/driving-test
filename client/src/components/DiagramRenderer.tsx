import OptimizedImage from './OptimizedImage';
import { Question } from '../types';

export default function DiagramRenderer({ question }: { question: Question }) {
  if (!question.diagramUrl || !question.diagramType) return null;
  if (question.diagramType === 'interactive') {
    return <div className="diagram-card"><div className="diagram-badge">توضيح تفاعلي</div><p className="font-bold text-ink">{question.diagramTitle || 'توضيح السؤال'}</p><p className="text-sm text-muted mt-1">{question.diagramDescription || 'هذا السؤال يحتوي على توضيح تفاعلي.'}</p></div>;
  }
  return <div className="diagram-card">
    <div className="diagram-badge">توضيح بصري</div>
    <OptimizedImage src={question.diagramUrl} alt={question.diagramTitle || 'توضيح بصري للسؤال'} className="w-full h-56 mt-2" />
    {(question.diagramTitle || question.diagramDescription) && <div className="mt-3"><p className="font-bold text-ink">{question.diagramTitle}</p><p className="text-sm text-muted mt-1 leading-relaxed">{question.diagramDescription}</p></div>}
  </div>;
}
