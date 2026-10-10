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
  if (pathname.startsWith('/study/Ishara')) return { id: 'signs', title: 'الإشارات المرورية', text: 'هذه صفحة تدريب الإشارات. انتبه لشكل الإشارة ولونها ورمزها، واختر الإجابة ثم راجع التفسير.' };
  if (pathname.startsWith('/study/Mechanic')) return { id: 'mechanic', title: 'تدريب الميكانيك', text: 'هذه صفحة تدريب الميكانيك. ركّز على اسم الجزء الرئيسي ووظيفته، ثم اختر الإجابة وراجع التفسير.' };
  if (pathname.startsWith('/study/')) return { id: 'training', title: 'التدريب والمراجعة', text: 'هذه صفحة التدريب. اقرأ السؤال والصورة جيداً، واختر الإجابة، ثم راجع التفسير قبل الانتقال للسؤال التالي.' };
  if (pathname.startsWith('/exam/')) return { id: 'exam', title: 'الاختبار', text: 'أنت في صفحة الاختبار. اقرأ السؤال جيداً وانتبه للوقت، واختر الإجابة التي تراها صحيحة.' };
  if (pathname.startsWith('/models')) return { id: 'models', title: 'نماذج الاختبار', text: 'من هنا تختار نموذج الاختبار. بعد الانتهاء تظهر النتيجة ويمكنك مراجعة إجاباتك.' };
  if (pathname.startsWith('/car-viewer')) return { id: 'car', title: 'استعراض السيارة ثلاثية الأبعاد', text: 'في عارض السيارة اسحب المجسم لتدويره، واستخدم التقريب، ثم اختر قطعة من القائمة لمعرفة مكانها.' };
  if (pathname.startsWith('/practical-info')) return { id: 'practical', title: 'المعلومات العملية', text: 'هذه صفحة المعلومات العملية، وفيها أمثلة عن أضواء السيارة والغمازات وطريقة استخدامها.' };
  if (pathname.startsWith('/app')) return { id: 'home', title: 'أهلاً بك في رخصتي', text: 'من الصفحة الرئيسية افتح التدريب، أو الإشارات، أو الميكانيك، أو اختر أحد نماذج الاختبار.' };
  if (pathname.startsWith('/rules')) return { id: 'rules', title: 'قواعد السير', text: 'راجع قواعد السير بهدوء، ويمكنك الانتقال إلى التدريب لتجربة أسئلة القواعد.' };
  if (pathname.startsWith('/traffic-signs')) return { id: 'public-signs', title: 'دليل الإشارات المرورية', text: 'تعرّف على معاني الإشارات هنا، ثم اختبر معلوماتك في قسم التدريب.' };
  return { id: 'welcome', title: 'مساعد رخصتي', text: 'أنا مساعدك في رخصتي. اضغط على الروبوت وسأشرح لك الصفحة الحالية بصوت عربي.' };
}

export default function FloatingSiteAssistant() {
  const { user } = useAuth();
  const location = useLocation();
  const [showSuggestion, setShowSuggestion] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [position, setPosition] = useState<Point>({ x: 20, y: 20 });
  const [positionReady, setPositionReady] = useState(false);
  const [robot3dReady, setRobot3dReady] = useState(false);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);
  const speechActiveRef = useRef(false);
  const locationRef = useRef(location.pathname);

  const stopSpeech = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    speechActiveRef.current = false;
    setIsSpeaking(false);
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
    stopSpeech();
    setShowSuggestion(true);
  }, [location.pathname]);

  useEffect(() => () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    speechActiveRef.current = false;
  }, []);

  // Only dodge a nearby tap. Far-away page clicks must not make the robot jump around.
  useEffect(() => {
    const onPagePress = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || target.closest('.rukhsati-site-assistant, .rukhsati-assistant-suggestion')) return;
      setPosition(current => {
        const centerX = current.x + ROBOT_WIDTH / 2;
        const centerY = current.y + ROBOT_HEIGHT / 2;
        let dx = centerX - event.clientX;
        let dy = centerY - event.clientY;
        const distance = Math.hypot(dx, dy);
        if (distance > 190) return current;
        if (distance < 1) { dx = 1; dy = -1; } else { dx /= distance; dy /= distance; }
        return clampPoint({ x: current.x + dx * 46, y: current.y + dy * 46 });
      });
    };
    document.addEventListener('pointerdown', onPagePress, true);
    return () => document.removeEventListener('pointerdown', onPagePress, true);
  }, []);

  // CSS fallback gaze; the actual Three.js pupils use the same pointer/touch signal.
  useEffect(() => {
    const followPointer = (event: PointerEvent) => {
      const x = Math.max(-2, Math.min(2, (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 4));
      const y = Math.max(-2, Math.min(2, (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 4));
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
  const speakCurrentPage = () => {
    // The robot itself is the direct speech control; do not open a popup first.
    setShowSuggestion(false);
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      setShowSuggestion(true);
      return;
    }
    if (speechActiveRef.current || window.speechSynthesis.speaking) {
      stopSpeech();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(activeTopic.text);
    utterance.lang = 'ar-SA';
    utterance.rate = 0.97;
    utterance.pitch = 1;
    const arabicVoice = window.speechSynthesis.getVoices().find(voice => /^ar([_-]|$)/i.test(voice.lang));
    if (arabicVoice) utterance.voice = arabicVoice;

    utterance.onstart = () => { speechActiveRef.current = true; setIsSpeaking(true); };
    utterance.onend = () => { speechActiveRef.current = false; setIsSpeaking(false); };
    utterance.onerror = () => { speechActiveRef.current = false; setIsSpeaking(false); setShowSuggestion(true); };
    speechActiveRef.current = true;
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const target = event.currentTarget;
    const pointerId = event.pointerId;
    const drag: DragState = {
      pointerId, startX: event.clientX, startY: event.clientY,
      originX: position.x, originY: position.y, moved: false, dragging: false,
    };
    drag.timer = window.setTimeout(() => {
      if (dragRef.current !== drag) return;
      drag.dragging = true;
      drag.moved = true;
      try { target.setPointerCapture(pointerId); } catch {}
      setShowSuggestion(false);
    }, 450);
    dragRef.current = drag;
    try { target.setPointerCapture(pointerId); } catch {}
  };

  const moveDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX, dy = event.clientY - drag.startY;
    if (!drag.dragging) {
      if (Math.hypot(dx, dy) > 12) {
        if (drag.timer) window.clearTimeout(drag.timer);
        drag.moved = true;
      }
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
      window.setTimeout(() => { suppressClickRef.current = false; }, 320);
    }
    try { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); } catch {}
  };

  const handleRobotClick = () => {
    if (suppressClickRef.current) { suppressClickRef.current = false; return; }
    speakCurrentPage();
  };

  const screenWidth = window.innerWidth, screenHeight = window.innerHeight;
  const suggestionWidth = Math.min(248, screenWidth - 24);
  const suggestionLeft = position.x + ROBOT_WIDTH + suggestionWidth + 10 <= screenWidth
    ? position.x + ROBOT_WIDTH + 10
    : Math.max(12, position.x - suggestionWidth - 10);
  const suggestionTop = Math.max(12, Math.min(position.y + 8, screenHeight - 82));

  if (user?.role === 'Admin' || location.pathname.startsWith('/admin')) return null;

  return (
    <div className="rukhsati-site-assistant" dir="rtl" data-robot-ready={robot3dReady ? 'true' : 'false'} data-speaking={isSpeaking ? 'true' : 'false'}>
      <button type="button" className="rukhsati-assistant-robot-button" style={{ left: position.x, top: position.y }}
        aria-label="مساعد رخصتي. انقر لسماع شرح الصفحة، أو اضغط مطولاً لتحريك الروبوت."
        title="انقر ليسمعك الشرح · اضغط مطولاً للتحريك"
        onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={finishDrag}
        onClick={handleRobotClick}>
        <FloatingRobot3D onReady={() => setRobot3dReady(true)} onError={() => setRobot3dReady(false)} />
        <span className="rukhsati-robot-stage" aria-hidden="true">
          <span className="rukhsati-robot-halo" /><span className="rukhsati-robot-shadow" /><span className="rukhsati-robot-antenna"><i /></span>
          <span className="rukhsati-robot-head"><i className="rukhsati-robot-ear rukhsati-robot-ear-left" /><i className="rukhsati-robot-ear rukhsati-robot-ear-right" /><span className="rukhsati-robot-visor"><i className="rukhsati-robot-eye rukhsati-robot-eye-left" /><i className="rukhsati-robot-eye rukhsati-robot-eye-right" /><i className="rukhsati-robot-mouth" /></span></span>
          <span className="rukhsati-robot-neck" /><span className="rukhsati-robot-torso"><i className="rukhsati-robot-chest-light" /></span>
          <i className="rukhsati-robot-arm rukhsati-robot-arm-left" /><i className="rukhsati-robot-arm rukhsati-robot-arm-right" /><i className="rukhsati-robot-leg rukhsati-robot-leg-left" /><i className="rukhsati-robot-leg rukhsati-robot-leg-right" />
        </span>
        <span className="rukhsati-robot-caption">{isSpeaking ? 'عم يحكي' : 'اسألني'}</span>
      </button>

      {showSuggestion && !isSpeaking && (
        <div className="rukhsati-assistant-suggestion" role="status" aria-live="polite"
          style={{ left: suggestionLeft, top: suggestionTop, width: suggestionWidth }}>
          <span>{activeTopic.text}</span>
          <b>اضغط على الروبوت لأشرح لك</b>
        </div>
      )}
    </div>
  );
}
