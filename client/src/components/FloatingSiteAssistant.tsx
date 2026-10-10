import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './floating-site-assistant.css';
import FloatingRobot3D from './FloatingRobot3D';

type GuideTopic = { id: string; title: string; summary: string; text: string; path: string; action: string };
type Point = { x: number; y: number };
type DragState = { pointerId: number; startX: number; startY: number; originX: number; originY: number; moved: boolean };

const POSITION_KEY = 'rukhsati-floating-robot-position';
const ROBOT_WIDTH = 92;
const ROBOT_HEIGHT = 104;
const topics: GuideTopic[] = [
  { id: 'welcome', title: 'أهلاً بك في رخصتي', summary: 'جولة سريعة في الموقع', text: 'اختر أحد أقسام التدريب لمراجعة قواعد السير أو الإشارات المرورية أو أساسيات الميكانيك، ثم جرّب نموذج اختبار عندما تصبح جاهزاً.', path: '/app', action: 'الصفحة الرئيسية' },
  { id: 'training', title: 'التدريب والمراجعة', summary: 'السؤال والإجابة والتفسير', text: 'افتح قسم التدريب واختر المادة التي تريدها. اقرأ السؤال والصورة، ثم اختر الإجابة وراجع التفسير قبل الانتقال إلى السؤال التالي.', path: '/study/Ser', action: 'افتح التدريب' },
  { id: 'signs', title: 'الإشارات المرورية', summary: 'افهم شكل الإشارة ومعناها', text: 'لاحظ شكل الإشارة ولونها ورمزها قبل اختيار معناها. بعد الإجابة، راجع التوضيح لتتعلّم من الخطأ.', path: '/study/Ishara', action: 'افتح الإشارات' },
  { id: 'mechanic', title: 'أساسيات الميكانيك', summary: 'الأجزاء ووظائفها', text: 'تدرّب على أسئلة الميكانيك وتعرّف على الأجزاء الرئيسية ووظيفة كل جزء من خلال السؤال والتفسير.', path: '/study/Mechanic', action: 'افتح الميكانيك' },
  { id: 'exam', title: 'محاكاة الاختبار', summary: 'النماذج والوقت والنتيجة', text: 'اختر نموذجاً من صفحة النماذج. يحتوي الاختبار على ثلاثين سؤالاً ومدة خمس عشرة دقيقة، ثم تظهر النتيجة ومراجعة الإجابات.', path: '/models', action: 'اختر نموذجاً' },
  { id: 'practical', title: 'المعلومات العملية', summary: 'الأضواء والغمازات', text: 'يعرض قسم المعلومات العملية أمثلة تفاعلية لأضواء السيارة والغمازات وطريقة استخدامها.', path: '/practical-info', action: 'المعلومات العملية' },
  { id: 'car', title: 'استعراض السيارة ثلاثية الأبعاد', summary: 'التدوير والتقريب والأجزاء', text: 'اختر السيارة من القائمة، واسحب داخل مساحة العرض لتدويرها. استخدم التكبير والتصغير ثم اختر قسماً لعرض الأجزاء الرئيسية.', path: '/car-viewer', action: 'استعرض السيارة' },
];

function clampPoint(point: Point): Point {
  return {
    x: Math.max(8, Math.min(Math.max(8, window.innerWidth - ROBOT_WIDTH - 8), point.x)),
    y: Math.max(8, Math.min(Math.max(8, window.innerHeight - ROBOT_HEIGHT - 8), point.y)),
  };
}

export default function FloatingSiteAssistant() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [activeTopicId, setActiveTopicId] = useState('welcome');
  const [status, setStatus] = useState('اختر موضوعاً لقراءة الشرح أو الاستماع إليه.');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [position, setPosition] = useState<Point>({ x: 20, y: 20 });
  const [positionReady, setPositionReady] = useState(false);
  const [robot3dReady, setRobot3dReady] = useState(false);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();

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
    const onResize = () => setPosition((current) => clampPoint(current));
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    setOpen(false);
    stopSpeech(false);
  }, [location.pathname]);

  useEffect(() => () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  // The CSS fallback also follows the pointer when WebGL is unavailable.
  useEffect(() => {
    const followPointer = (event: PointerEvent) => {
      const x = Math.max(-3, Math.min(3, (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 6));
      const y = Math.max(-3, Math.min(3, (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 6));
      document.querySelectorAll<HTMLElement>('.rukhsati-site-assistant .rukhsati-robot-eye').forEach((eye) => {
        eye.style.setProperty('translate', x + 'px ' + y + 'px');
      });
    };
    window.addEventListener('pointermove', followPointer, { passive: true });
    window.addEventListener('pointerdown', followPointer, { passive: true });
    return () => {
      window.removeEventListener('pointermove', followPointer);
      window.removeEventListener('pointerdown', followPointer);
    };
  }, []);

  const playTopic = (topic: GuideTopic) => {
    setActiveTopicId(topic.id);
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      setIsSpeaking(false);
      setStatus('الصوت غير متاح على هذا الجهاز حالياً؛ يمكنك قراءة الشرح الظاهر.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(topic.text);
    utterance.lang = 'ar-SA';
    utterance.rate = 0.96;
    utterance.pitch = 1.02;
    const arabicVoice = window.speechSynthesis.getVoices().find((voice) => /^ar([_-]|$)/i.test(voice.lang));
    if (arabicVoice) utterance.voice = arabicVoice;
    utterance.onstart = () => {
      setIsSpeaking(true);
      setStatus('يعمل صوت الجهاز مؤقتاً، بانتظار إعداد الصوت المخصّص للمساعد.');
    };
    utterance.onend = () => { setIsSpeaking(false); setStatus('انتهى الشرح الصوتي.'); };
    utterance.onerror = () => { setIsSpeaking(false); setStatus('تعذّر تشغيل الصوت؛ يمكنك قراءة الشرح الظاهر.'); };
    setStatus('جارٍ تشغيل الشرح الصوتي…');
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: position.x, originY: position.y, moved: false };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch {}
  };

  const moveDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    drag.moved = true;
    setPosition(clampPoint({ x: drag.originX + dx, y: drag.originY + dy }));
    event.preventDefault();
  };

  const finishDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (drag.moved) {
      suppressClickRef.current = true;
      window.setTimeout(() => { suppressClickRef.current = false; }, 280);
    }
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {}
  };

  const toggleAssistant = () => {
    if (suppressClickRef.current) { suppressClickRef.current = false; return; }
    if (open) { stopSpeech(); setOpen(false); } else setOpen(true);
  };

  const activeTopic = topics.find((topic) => topic.id === activeTopicId) ?? topics[0];
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const panelWidth = Math.min(356, screenWidth - 24);
  const panelHeight = Math.min(520, screenHeight * 0.7);
  const panelLeft = Math.max(12, Math.min(position.x - panelWidth + 104, screenWidth - panelWidth - 12));
  const panelTop = Math.max(12, Math.min(position.y - panelHeight - 10, screenHeight - panelHeight - 12));

  // Show the helper to visitors as well as students; only keep it off the admin console.
  if (user?.role === 'Admin' || location.pathname.startsWith('/admin')) return null;

  return (
    <div className="rukhsati-site-assistant" dir="rtl" data-robot-ready={robot3dReady ? 'true' : 'false'}>
      <button
        type="button"
        className="rukhsati-assistant-robot-button"
        style={{ left: position.x, top: position.y }}
        aria-label="مساعد رخصتي. اضغط لفتح الشرح، أو اسحب المجسّم لتحريكه."
        aria-expanded={open}
        aria-controls="rukhsati-assistant-panel"
        title="اسحب المجسّم لتحريكه أو اضغط لفتح المساعدة"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onClick={toggleAssistant}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 28 : 14;
          const directions: Record<string, Point> = {
            ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 },
            ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step },
          };
          const delta = directions[event.key];
          if (!delta) return;
          event.preventDefault();
          setPosition((current) => clampPoint({ x: current.x + delta.x, y: current.y + delta.y }));
        }}
      >
        <FloatingRobot3D onReady={() => setRobot3dReady(true)} onError={() => setRobot3dReady(false)} />
        <span className="rukhsati-robot-stage" aria-hidden="true">
          <span className="rukhsati-robot-halo" /><span className="rukhsati-robot-shadow" /><span className="rukhsati-robot-antenna"><i /></span>
          <span className="rukhsati-robot-head">
            <i className="rukhsati-robot-ear rukhsati-robot-ear-left" /><i className="rukhsati-robot-ear rukhsati-robot-ear-right" />
            <span className="rukhsati-robot-visor"><i className="rukhsati-robot-eye rukhsati-robot-eye-left" /><i className="rukhsati-robot-eye rukhsati-robot-eye-right" /><i className="rukhsati-robot-mouth" /></span>
          </span>
          <span className="rukhsati-robot-neck" /><span className="rukhsati-robot-torso"><i className="rukhsati-robot-chest-light" /></span>
          <i className="rukhsati-robot-arm rukhsati-robot-arm-left" /><i className="rukhsati-robot-arm rukhsati-robot-arm-right" />
          <i className="rukhsati-robot-leg rukhsati-robot-leg-left" /><i className="rukhsati-robot-leg rukhsati-robot-leg-right" />
        </span>
        <span className="rukhsati-robot-caption">اسألني</span>
      </button>

      {open && (
        <section
          id="rukhsati-assistant-panel"
          className="rukhsati-assistant-panel"
          style={{ left: panelLeft, top: panelTop }}
          role="dialog"
          aria-modal="false"
          aria-labelledby="rukhsati-assistant-title"
        >
          <header className="rukhsati-assistant-header">
            <span className="rukhsati-assistant-header-avatar" aria-hidden="true"><span className="rukhsati-mini-robot-face"><i /><i /><b /></span></span>
            <div><span className="rukhsati-assistant-kicker">مساعد رخصتي</span><h2 id="rukhsati-assistant-title">كيف أساعدك؟</h2></div>
            <button type="button" className="rukhsati-assistant-close" aria-label="إغلاق المساعد" onClick={() => { stopSpeech(false); setOpen(false); }}>×</button>
          </header>
          <div className="rukhsati-assistant-content">
            <div className="rukhsati-assistant-explanation" aria-live="polite"><strong>{activeTopic.title}</strong><p>{activeTopic.text}</p></div>
            <div className="rukhsati-assistant-topics" role="group" aria-label="مواضيع المساعدة">
              {topics.map((topic) => (
                <button type="button" key={topic.id} className="rukhsati-assistant-topic" data-active={activeTopicId === topic.id ? 'true' : 'false'} aria-pressed={activeTopicId === topic.id} onClick={() => playTopic(topic)}>
                  <span className="rukhsati-assistant-topic-mark" aria-hidden="true">{activeTopicId === topic.id ? '▶' : '›'}</span>
                  <span className="rukhsati-assistant-topic-copy"><strong>{topic.title}</strong><small>{topic.summary}</small></span>
                </button>
              ))}
            </div>
          </div>
          <footer className="rukhsati-assistant-footer">
            <span className="rukhsati-assistant-status" role="status" aria-live="polite">{status}</span>
            <div className="rukhsati-assistant-actions">
              <button type="button" className="rukhsati-assistant-stop" disabled={!isSpeaking} onClick={() => stopSpeech()}>إيقاف الصوت</button>
              <button type="button" className="rukhsati-assistant-open-page" onClick={() => { stopSpeech(false); setOpen(false); navigate(activeTopic.path); }}>{activeTopic.action}</button>
            </div>
          </footer>
        </section>
      )}
    </div>
  );
}
