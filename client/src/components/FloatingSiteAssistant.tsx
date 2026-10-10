import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './floating-site-assistant.css';
import FloatingRobot3D from './FloatingRobot3D';

type GuideTopic = { id: string; title: string; text: string };
type Point = { x: number; y: number };
type DragState = {
  pointerId: number; startX: number; startY: number; originX: number; originY: number;
  moved: boolean; dragging: boolean; timer?: number;
};

const POSITION_KEY = 'rukhsati-floating-robot-position';
const ROBOT_WIDTH = 92;
const ROBOT_HEIGHT = 104;

function clampPoint(point: Point): Point {
  return {
    x: Math.max(8, Math.min(Math.max(8, window.innerWidth - ROBOT_WIDTH - 8), point.x)),
    y: Math.max(8, Math.min(Math.max(8, window.innerHeight - ROBOT_HEIGHT - 8), point.y)),
  };
}

function topicForPath(pathname: string): GuideTopic {
  if (pathname.startsWith('/study/Ishara')) return { id: 'signs', title: 'الإشارات المرورية', text: 'لاحظ شكل الإشارة ولونها ورمزها، وحاول تحديد معناها قبل اختيار الإجابة. يمكنك مراجعة التفسير بعد الإجابة.' };
  if (pathname.startsWith('/study/Mechanic')) return { id: 'mechanic', title: 'تدريب الميكانيك', text: 'ركّز على اسم الجزء الرئيسي ووظيفته، ثم اختر الإجابة وراجع التفسير قبل الانتقال للسؤال التالي.' };
  if (pathname.startsWith('/study/')) return { id: 'training', title: 'التدريب والمراجعة', text: 'اقرأ السؤال والصورة جيداً، واختر الإجابة ثم راجع التفسير. يمكنك الانتقال بين الأسئلة من أزرار التدريب.' };
  if (pathname.startsWith('/exam/')) return { id: 'exam', title: 'الاختبار', text: 'اختر الإجابة الأقرب للصحيح وانتبه للوقت. بعد إنهاء النموذج ستظهر نتيجتك ويمكنك مراجعة الإجابات.' };
  if (pathname.startsWith('/models')) return { id: 'models', title: 'نماذج الاختبار', text: 'اختر النموذج الذي تريد تجربته. الاختبار يحاكي نمط الامتحان، وبعد الانتهاء تظهر النتيجة.' };
  if (pathname.startsWith('/car-viewer')) return { id: 'car', title: 'استعراض السيارة ثلاثية الأبعاد', text: 'يمكنك تدوير السيارة بالسحب، والتقريب، واختيار أحد الأجزاء الرئيسية من القائمة.' };
  if (pathname.startsWith('/practical-info')) return { id: 'practical', title: 'المعلومات العملية', text: 'من هنا تتعرف على أضواء السيارة والغمازات وطريقة استخدامها.' };
  if (pathname.startsWith('/app')) return { id: 'home', title: 'أهلاً بك في رخصتي', text: 'من الصفحة الرئيسية انتقل إلى التدريب، أو راجع الإشارات والميكانيك، أو افتح أحد نماذج الاختبار.' };
  if (pathname.startsWith('/rules')) return { id: 'rules', title: 'قواعد السير', text: 'راجع القواعد بهدوء، وإذا أردت التدريب عليها انتقل إلى قسم التدريب في رخصتي.' };
  if (pathname.startsWith('/traffic-signs')) return { id: 'public-signs', title: 'دليل الإشارات المرورية', text: 'تعرّف على معنى الإشارات هنا، ويمكنك بعد تسجيل الدخول اختبار معلوماتك في قسم الإشارات.' };
  return { id: 'welcome', title: 'مساعد رخصتي', text: 'أنا مساعدك في رخصتي. اضغط عليّ لشرح الصفحة الحالية أو لسماع إرشاداتها.' };
}

export default function FloatingSiteAssistant() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(true);
  const [status, setStatus] = useState('اضغط «اسمع الشرح» للاستماع إلى إرشادات هذه الصفحة.');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [position, setPosition] = useState<Point>({ x: 20, y: 20 });
  const [positionReady, setPositionReady] = useState(false);
  const [robot3dReady, setRobot3dReady] = useState(false);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);
  const locationRef = useRef(location.pathname);

  const stopSpeech = (announce = true) => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    if (announce) setStatus('تم إيقاف الصوت.');
  };

  useEffect(() => {
    let initial = { x: 20, y: window.innerHeight - ROBOT_HEIGHT - 18 };
    try {
      const saved = localStorage.getItem(POSITION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<Point>;
        if (Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) initial = { x: parsed.x as number, y: parsed.y as number };
      }
    } catch {}
    setPosition(clampPoint(initial));
    setPositionReady(true);
  }, []);

  useEffect(() => {
    if (!positionReady) return;
    try { localStorage.setItem(POSITION_KEY, JSON.stringify(position)); } catch {}
  }, [position, positionReady]);

  useEffect(() => {
    const onResize = () => setPosition(current => clampPoint(current));
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (locationRef.current === location.pathname) return;
    locationRef.current = location.pathname;
    setOpen(false);
    setShowSuggestion(true);
    stopSpeech(false);
  }, [location.pathname]);

  useEffect(() => () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  // A playful dodge on page taps; pressing the robot itself is always intentional.
  useEffect(() => {
    const onPagePress = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || target.closest('.rukhsati-site-assistant')) return;
      setPosition(current => {
        const centerX = current.x + ROBOT_WIDTH / 2;
        const centerY = current.y + ROBOT_HEIGHT / 2;
        let dx = centerX - event.clientX;
        let dy = centerY - event.clientY;
        const length = Math.hypot(dx, dy);
        if (length < 1) { dx = 1; dy = -1; } else { dx /= length; dy /= length; }
        return clampPoint({ x: current.x + dx * 58, y: current.y + dy * 58 });
      });
    };
    document.addEventListener('pointerdown', onPagePress, true);
    return () => document.removeEventListener('pointerdown', onPagePress, true);
  }, []);

  useEffect(() => {
    const followPointer = (event: PointerEvent) => {
      const x = Math.max(-3, Math.min(3, (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 6));
      const y = Math.max(-3, Math.min(3, (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 6));
      document.querySelectorAll<HTMLElement>('.rukhsati-site-assistant .rukhsati-robot-eye').forEach(eye => eye.style.setProperty('translate', x + 'px ' + y + 'px'));
    };
    window.addEventListener('pointermove', followPointer, { passive: true });
    window.addEventListener('pointerdown', followPointer, { passive: true });
    return () => {
      window.removeEventListener('pointermove', followPointer);
      window.removeEventListener('pointerdown', followPointer);
    };
  }, []);

  const activeTopic = topicForPath(location.pathname);
  const playTopic = () => {
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      setIsSpeaking(false);
      setStatus('الصوت غير متاح على هذا الجهاز حالياً؛ يمكنك قراءة الشرح الظاهر.');
      return;
    }
    if (isSpeaking) { stopSpeech(); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(activeTopic.text);
    utterance.lang = 'ar-SA';
    utterance.rate = 0.96;
    utterance.pitch = 1.02;
    const arabicVoice = window.speechSynthesis.getVoices().find(voice => /^ar([_-]|$)/i.test(voice.lang));
    if (arabicVoice) utterance.voice = arabicVoice;
    utterance.onstart = () => { setIsSpeaking(true); setStatus('يعمل صوت الجهاز مؤقتاً إلى أن يتم إعداد صوت المساعد المخصّص.'); };
    utterance.onend = () => { setIsSpeaking(false); setStatus('انتهى الشرح الصوتي.'); };
    utterance.onerror = () => { setIsSpeaking(false); setStatus('تعذّر تشغيل الصوت؛ يمكنك قراءة الرسالة.'); };
    setStatus('جارٍ تشغيل الشرح الصوتي…');
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const target = event.currentTarget;
    const pointerId = event.pointerId;
    const drag: DragState = { pointerId, startX: event.clientX, startY: event.clientY, originX: position.x, originY: position.y, moved: false, dragging: false };
    drag.timer = window.setTimeout(() => {
      if (dragRef.current !== drag) return;
      drag.dragging = true;
      drag.moved = true;
      try { target.setPointerCapture(pointerId); } catch {}
      setShowSuggestion(false);
    }, 420);
    dragRef.current = drag;
    try { target.setPointerCapture(pointerId); } catch {}
  };

  const moveDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX, dy = event.clientY - drag.startY;
    if (!drag.dragging) {
      if (Math.hypot(dx, dy) > 8) { if (drag.timer) window.clearTimeout(drag.timer); drag.moved = true; }
      return;
    }
    setPosition(clampPoint({ x: drag.originX + dx, y: drag.originY + dy }));
    event.preventDefault();
  };

  const finishDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (drag.timer) window.clearTimeout(drag.timer);
    if (drag.moved) {
      suppressClickRef.current = true;
      window.setTimeout(() => { suppressClickRef.current = false; }, 300);
    }
    try { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); } catch {}
  };

  const toggleAssistant = () => {
    if (suppressClickRef.current) { suppressClickRef.current = false; return; }
    if (open) { stopSpeech(false); setOpen(false); }
    else { setShowSuggestion(false); setOpen(true); }
  };

  const screenWidth = window.innerWidth, screenHeight = window.innerHeight;
  const panelWidth = Math.min(340, screenWidth - 24), panelHeight = Math.min(245, screenHeight * 0.48);
  const panelLeft = Math.max(12, Math.min(position.x - panelWidth + 104, screenWidth - panelWidth - 12));
  const panelTop = Math.max(12, Math.min(position.y - panelHeight - 12, screenHeight - panelHeight - 12));
  const suggestionWidth = Math.min(248, screenWidth - 24);
  const suggestionLeft = position.x + ROBOT_WIDTH + suggestionWidth + 10 <= screenWidth ? position.x + ROBOT_WIDTH + 10 : Math.max(12, position.x - suggestionWidth - 10);
  const suggestionTop = Math.max(12, Math.min(position.y + 8, screenHeight - 82));

  if (user?.role === 'Admin' || location.pathname.startsWith('/admin')) return null;

  return (
    <div className="rukhsati-site-assistant" dir="rtl" data-robot-ready={robot3dReady ? 'true' : 'false'}>
      <button type="button" className="rukhsati-assistant-robot-button" style={{ left: position.x, top: position.y }}
        aria-label="مساعد رخصتي. انقر لفتح المساعدة، أو اضغط مطولاً لتحريك الروبوت."
        aria-expanded={open} aria-controls="rukhsati-assistant-panel" title="نقرة للمساعدة · ضغط مطوّل للتحريك"
        onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={finishDrag} onClick={toggleAssistant}>
        <FloatingRobot3D onReady={() => setRobot3dReady(true)} onError={() => setRobot3dReady(false)} />
        <span className="rukhsati-robot-stage" aria-hidden="true">
          <span className="rukhsati-robot-halo" /><span className="rukhsati-robot-shadow" /><span className="rukhsati-robot-antenna"><i /></span>
          <span className="rukhsati-robot-head"><i className="rukhsati-robot-ear rukhsati-robot-ear-left" /><i className="rukhsati-robot-ear rukhsati-robot-ear-right" /><span className="rukhsati-robot-visor"><i className="rukhsati-robot-eye rukhsati-robot-eye-left" /><i className="rukhsati-robot-eye rukhsati-robot-eye-right" /><i className="rukhsati-robot-mouth" /></span></span>
          <span className="rukhsati-robot-neck" /><span className="rukhsati-robot-torso"><i className="rukhsati-robot-chest-light" /></span>
          <i className="rukhsati-robot-arm rukhsati-robot-arm-left" /><i className="rukhsati-robot-arm rukhsati-robot-arm-right" /><i className="rukhsati-robot-leg rukhsati-robot-leg-left" /><i className="rukhsati-robot-leg rukhsati-robot-leg-right" />
        </span>
        <span className="rukhsati-robot-caption">اسألني</span>
      </button>

      {showSuggestion && !open && (
        <button type="button" className="rukhsati-assistant-suggestion"
          style={{ left: suggestionLeft, top: suggestionTop, width: suggestionWidth }}
          onClick={() => { setShowSuggestion(false); setOpen(true); }} aria-label="افتح اقتراح المساعدة لهذه الصفحة">
          <span>{activeTopic.text}</span><b>شرح الصفحة ←</b>
        </button>
      )}

      {open && (
        <section id="rukhsati-assistant-panel" className="rukhsati-assistant-panel" style={{ left: panelLeft, top: panelTop }}
          role="dialog" aria-modal="false" aria-labelledby="rukhsati-assistant-title">
          <header className="rukhsati-assistant-header">
            <span className="rukhsati-assistant-header-avatar" aria-hidden="true"><span className="rukhsati-mini-robot-face"><i /><i /><b /></span></span>
            <div><span className="rukhsati-assistant-kicker">مساعد رخصتي</span><h2 id="rukhsati-assistant-title">{activeTopic.title}</h2></div>
            <button type="button" className="rukhsati-assistant-close" aria-label="إغلاق المساعد" onClick={() => { stopSpeech(false); setOpen(false); }}>×</button>
          </header>
          <div className="rukhsati-assistant-content"><div className="rukhsati-assistant-explanation" aria-live="polite"><p>{activeTopic.text}</p></div></div>
          <footer className="rukhsati-assistant-footer">
            <span className="rukhsati-assistant-status" role="status" aria-live="polite">{status}</span>
            <div className="rukhsati-assistant-actions"><button type="button" className="rukhsati-assistant-open-page" onClick={playTopic}>{isSpeaking ? 'إيقاف الصوت' : 'اسمع الشرح'}</button></div>
          </footer>
        </section>
      )}
    </div>
  );
}
