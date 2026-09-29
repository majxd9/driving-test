import { ReactNode, useEffect, useState } from 'react';

type ContentProtectionProps = {
  children: ReactNode;
  studentName?: string;
};

const BLOCKED_KEYS = new Set(['PrintScreen']);

export function ContentProtection({ children, studentName = 'رخصتي' }: ContentProtectionProps) {
  const [notice, setNotice] = useState(false);

  useEffect(() => {
    let timer: number | undefined;

    const showNotice = () => {
      setNotice(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setNotice(false), 1400);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const modified = event.ctrlKey || event.metaKey;

      if (BLOCKED_KEYS.has(event.key) || (modified && ['p', 's', 'u', 'c', 'x'].includes(key))) {
        event.preventDefault();
        event.stopPropagation();
        showNotice();
      }
    };

    const handleBeforePrint = () => {
      showNotice();
    };

    const handleDragStart = (event: DragEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('.content-protection')) {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('dragstart', handleDragStart, true);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('dragstart', handleDragStart, true);
    };
  }, []);

  const block = (event: React.SyntheticEvent) => {
    event.preventDefault();
    showNotice();
  };

  return (
    <div
      className="content-protection"
      onContextMenuCapture={block}
      onCopyCapture={block}
      onCutCapture={block}
      onDragStartCapture={block}
      onSelectStartCapture={block}
    >
      <div className="content-protection-watermark" aria-hidden="true">
        {Array.from({ length: 12 }, (_, index) => (
          <span key={index}>{studentName} · رخصتي</span>
        ))}
      </div>

      <div className="content-protection-print-block" aria-hidden="true">
        هذا المحتوى التعليمي محمي داخل منصة رخصتي.
        <br />
        الطباعة والحفظ كـ PDF غير متاحين.
      </div>

      {children}

      {notice && (
        <div className="content-protection-notice" role="status" aria-live="polite">
          المحتوى محمي
        </div>
      )}
    </div>
  );
}
