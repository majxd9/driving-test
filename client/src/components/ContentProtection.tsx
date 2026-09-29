import { ReactNode, useEffect, useRef, useState } from 'react';

type ContentProtectionProps = {
  children: ReactNode;
};

const BLOCKED_KEYS = new Set(['PrintScreen']);

export function ContentProtection({ children }: ContentProtectionProps) {
  const [notice, setNotice] = useState(false);
  const [captureShield, setCaptureShield] = useState(false);
  const noticeTimer = useRef<number | undefined>(undefined);
  const shieldTimer = useRef<number | undefined>(undefined);

  const showNotice = () => {
    setNotice(true);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(false), 1400);
  };

  const brieflyHideContent = () => {
    setCaptureShield(true);
    window.clearTimeout(shieldTimer.current);
    shieldTimer.current = window.setTimeout(() => setCaptureShield(false), 1200);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const modified = event.ctrlKey || event.metaKey;

      if (
        BLOCKED_KEYS.has(event.key) ||
        (modified && ['p', 's', 'u', 'c', 'x', 'a'].includes(key))
      ) {
        event.preventDefault();
        event.stopPropagation();
        showNotice();

        if (event.key === 'PrintScreen') {
          brieflyHideContent();
        }
      }
    };

    const handleBeforePrint = () => {
      brieflyHideContent();
      showNotice();
    };

    const handleDragStart = (event: DragEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('.content-protection')) {
        event.preventDefault();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        brieflyHideContent();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('dragstart', handleDragStart, true);
    document.addEventListener('visibilitychange', handleVisibilityChange, true);

    return () => {
      window.clearTimeout(noticeTimer.current);
      window.clearTimeout(shieldTimer.current);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('dragstart', handleDragStart, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange, true);
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
    >
      <div className="content-protection-print-block" aria-hidden="true">
        هذا المحتوى التعليمي محمي داخل منصة رخصتي.
        <br />
        الطباعة والحفظ كـ PDF غير متاحين.
      </div>

      {children}

      {captureShield && (
        <div className="content-protection-capture-shield" aria-hidden="true" />
      )}

      {notice && (
        <div className="content-protection-notice" role="status" aria-live="polite">
          المحتوى محمي
        </div>
      )}
    </div>
  );
}
