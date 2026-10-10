import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { resolveApiUrl } from '../api/client';
import './floating-site-assistant.css';
import FloatingRobot3D from './FloatingRobot3D';

type GuideTopic = { id: string; title: string; text: string };
type Point = { x: number; y: number };
type AssistantSpeechContext = { title?: string; text: string; audioUrl?: string | null };
type DragState = {
  pointerId: number; startX: number; startY: number; originX: number; originY: number;
  moved: boolean; dragging: boolean; soundPlayed: boolean; timer?: number;
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
  if (pathname.startsWith('/study/Ishara')) return { id: 'signs', title: 'الإشارات المرورية', text: 'في تدريب الإشارات، لاحظ الشكل واللون والرمز، ثم اختر الإجابة وراجع التفسير.' };
  if (pathname.startsWith('/study/Mechanic')) return { id: 'mechanic', title: 'تدريب الميكانيك', text: 'في الميكانيك، تعرّف على الجزء ووظيفته، اختر الإجابة، ثم راجع التفسير.' };
  if (pathname.startsWith('/study/')) return { id: 'training', title: 'التدريب والمراجعة', text: 'اقرأ السؤال والصورة بهدوء، اختر الإجابة، ثم راجع التفسير قبل السؤال التالي.' };
  if (pathname.startsWith('/exam/')) return { id: 'exam', title: 'الاختبار', text: 'أنت في الاختبار؛ اقرأ السؤال جيداً واختر إجابتك قبل انتهاء الوقت.' };
  if (pathname.startsWith('/models')) return { id: 'models', title: 'نماذج الاختبار', text: 'اختر نموذج الاختبار المناسب. بعد الانتهاء ستظهر نتيجتك ويمكنك مراجعة الإجابات.' };
  if (pathname.startsWith('/car-viewer')) return { id: 'car', title: 'استعراض السيارة ثلاثية الأبعاد', text: 'اسحب السيارة لتدويرها، وكبّر لرؤية التفاصيل، واختر قطعة لمعرفة اسمها ومكانها.' };
  if (pathname.startsWith('/practical-info')) return { id: 'practical', title: 'المعلومات العملية', text: 'هنا تتعرّف على استخدام أضواء السيارة والغمازات. استعرض الأمثلة ثم جرّبها.' };
  if (pathname.startsWith('/app')) return { id: 'home', title: 'الرئيسية', text: 'من هنا تبدأ التدريب، وتتعلّم الإشارات والميكانيك، أو تدخل نموذج اختبار.' };
  if (pathname.startsWith('/rules')) return { id: 'rules', title: 'قواعد السير', text: 'استعرض قواعد السير الأساسية، ثم انتقل إلى التدريب لتجربة ما تعلمته.' };
  if (pathname.startsWith('/traffic-signs')) return { id: 'public-signs', title: 'دليل الإشارات المرورية', text: 'استعرض الإشارات ومعانيها، ثم اختبر فهمك من قسم التدريب.' };
  if (pathname.startsWith('/result')) return { id: 'result', title: 'النتيجة', text: 'هذه نتيجتك. راجع إجاباتك، وركّز على النقاط التي تحتاج إلى تدريب إضافي.' };
  if (pathname.startsWith('/about')) return { id: 'about', title: 'عن رخصتي', text: 'هنا تجد نبذة عن رخصتي وكيف يساعدك على الاستعداد لاختبار القيادة.' };
  if (pathname.startsWith('/driving-test-syria')) return { id: 'syrian-test', title: 'امتحان القيادة في سوريا', text: 'تعرّف على معلومات امتحان القيادة في سوريا، ثم تدرّب على الإشارات والقواعد.' };
  if (pathname === '/' || pathname.startsWith('/login')) return { id: 'login', title: 'تسجيل الدخول', text: 'أهلاً بك! سجّل الدخول للمتابعة إلى تدريباتك ونماذج الاختبار.' };
  if (pathname.startsWith('/admin')) return { id: 'welcome', title: 'مساعد رخصتي', text: 'أهلاً بك في رخصتي. اضغط على ديلي متى احتجت مساعدة في الصفحة.' };
  return { id: 'not-found', title: 'الصفحة غير موجودة', text: 'لم أجد الصفحة المطلوبة. ارجع للرئيسية أو اختر أحد أقسام رخصتي.' };
}

export default function FloatingSiteAssistant() {
  const location = useLocation();
  const [showSuggestion, setShowSuggestion] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [speechContext, setSpeechContext] = useState<AssistantSpeechContext | null>(null);
  const [position, setPosition] = useState<Point>({ x: 20, y: 20 });
  const [positionReady, setPositionReady] = useState(false);
  const [robot3dReady, setRobot3dReady] = useState(false);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);
  const speechActiveRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const locationRef = useRef(location.pathname);
  const positionRef = useRef(position);
  const lastDodgeAtRef = useRef(0);
  const movementAudioRef = useRef<AudioContext | null>(null);

  const playMovementTick = () => {
    try {
      const AudioContextConstructor = window.AudioContext;
      if (!AudioContextConstructor) return;
      const context = movementAudioRef.current ?? new AudioContextConstructor();
      movementAudioRef.current = context;
      if (context.state === 'suspended') void context.resume();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(740, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(520, context.currentTime + 0.045);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.018, context.currentTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.055);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.06);
    } catch { /* Decorative sound must never block movement. */ }
  };

  const stopSpeech = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setSpeechError(null);
    const activeAudio = audioRef.current;
    if (activeAudio) {
      activeAudio.onended = null;
      activeAudio.onerror = null;
      activeAudio.pause();
      activeAudio.removeAttribute('src');
      activeAudio.load();
      audioRef.current = null;
    }
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
    positionRef.current = position;
    if (!positionReady) return;
    try { localStorage.setItem(POSITION_KEY, JSON.stringify(position)); } catch {}
  }, [position, positionReady]);

  useEffect(() => {
    const handleAssistantContext = (event: Event) => {
      const detail = (event as CustomEvent<AssistantSpeechContext | null>).detail;
      if (detail && typeof detail.text === 'string' && detail.text.trim()) {
        setSpeechContext({ ...detail, text: detail.text.trim() });
        if (detail.title === 'شرح الإجابة') setShowSuggestion(true);
      } else {
        setSpeechContext(null);
      }
    };
    window.addEventListener('rukhsati-assistant-context', handleAssistantContext);
    return () => window.removeEventListener('rukhsati-assistant-context', handleAssistantContext);
  }, []);

  // A nearby page tap makes Deli glide away a little. Taps on Deli itself and long-press
  // dragging remain untouched, and a cooldown prevents the movement from becoming annoying.
  useEffect(() => {
    const handleNearbyPress = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest('.rukhsati-site-assistant')) return;
      const now = Date.now();
      if (now - lastDodgeAtRef.current < 650) return;

      const current = positionRef.current;
      const centerX = current.x + ROBOT_WIDTH / 2;
      const centerY = current.y + ROBOT_HEIGHT / 2;
      let dx = centerX - event.clientX;
      let dy = centerY - event.clientY;
      let distance = Math.hypot(dx, dy);
      if (distance > 150) return;
      if (distance < 1) {
        dx = centerX < window.innerWidth / 2 ? 1 : -1;
        dy = centerY < window.innerHeight / 2 ? 1 : -1;
        distance = Math.hypot(dx, dy);
      }

      lastDodgeAtRef.current = now;
      playMovementTick();
      setShowSuggestion(false);
      setPosition(clampPoint({
        x: current.x + (dx / distance) * 62,
        y: current.y + (dy / distance) * 62,
      }));
    };

    document.addEventListener('pointerdown', handleNearbyPress, true);
    return () => document.removeEventListener('pointerdown', handleNearbyPress, true);
  }, []);

  useEffect(() => {
    const onResize = () => setPosition(current => clampPoint(current));
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (locationRef.current !== location.pathname) {
      locationRef.current = location.pathname;
      stopSpeech();
    }
    setShowSuggestion(true);
    const hideHint = window.setTimeout(() => setShowSuggestion(false), 4500);
    return () => window.clearTimeout(hideHint);
  }, [location.pathname]);

  useEffect(() => () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    const activeAudio = audioRef.current;
    if (activeAudio) {
      activeAudio.onended = null;
      activeAudio.onerror = null;
      activeAudio.pause();
      activeAudio.removeAttribute('src');
      activeAudio.load();
      audioRef.current = null;
    }
    speechActiveRef.current = false;
    void movementAudioRef.current?.close().catch(() => {});
    movementAudioRef.current = null;
  }, []);

  const activeTopic = topicForPath(location.pathname);
  const speakWithDeviceVoice = () => {
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      speechActiveRef.current = false;
      setIsSpeaking(false);
      setShowSuggestion(true);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(speechContext?.text ?? activeTopic.text);
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

  const speakCurrentPage = () => {
    // Playback remains strictly click-to-play. No audio starts on page load/navigation.
    setShowSuggestion(false);
    setSpeechError(null);
    if (speechActiveRef.current || audioRef.current || ('speechSynthesis' in window && window.speechSynthesis.speaking)) {
      stopSpeech();
      return;
    }

    const key = `site-assistant-${activeTopic.id}`;
    const source = speechContext?.audioUrl
      ? resolveApiUrl(speechContext.audioUrl)
      : resolveApiUrl(`/api/questions/audio-prompt/${encodeURIComponent(key)}`);
    const audio = new Audio(source);
    audio.preload = 'auto';
    audioRef.current = audio;
    speechActiveRef.current = true;
    setIsSpeaking(true);

    let fellBack = false;
    const useDeviceVoice = () => {
      if (fellBack || audioRef.current !== audio) return;
      fellBack = true;
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audioRef.current = null;
      speechActiveRef.current = false;
      setIsSpeaking(false);

      // Explanation narration must keep Deli's Fish Audio voice. Do not silently
      // switch to the browser's unrelated Arabic voice if the server cannot prepare it.
      if (speechContext?.audioUrl) {
        setSpeechError('تعذر تجهيز صوت الشرح بصوت ديلي الآن. اضغط على ديلي للمحاولة مرة ثانية.');
        setShowSuggestion(true);
        return;
      }
      speakWithDeviceVoice();
    };

    audio.onplay = () => {
      if (audioRef.current !== audio) return;
      speechActiveRef.current = true;
      setIsSpeaking(true);
    };
    audio.onended = () => {
      if (audioRef.current !== audio) return;
      audioRef.current = null;
      speechActiveRef.current = false;
      setIsSpeaking(false);
    };
    audio.onerror = useDeviceVoice;
    void audio.play().catch(useDeviceVoice);
  };

  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const target = event.currentTarget;
    const pointerId = event.pointerId;
    const drag: DragState = {
      pointerId, startX: event.clientX, startY: event.clientY,
      originX: position.x, originY: position.y, moved: false, dragging: false, soundPlayed: false,
    };
    drag.timer = window.setTimeout(() => {
      if (dragRef.current !== drag) return;
      drag.dragging = true;
      drag.moved = true;
      target.dataset.dragging = 'true';
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
    if (!drag.soundPlayed) {
      drag.soundPlayed = true;
      playMovementTick();
    }
    event.preventDefault();
  };

  const finishDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    event.currentTarget.dataset.dragging = 'false';
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

  if (location.pathname.startsWith('/admin')) return null;

  return (
    <div className="rukhsati-site-assistant" dir="rtl" data-robot-ready={robot3dReady ? 'true' : 'false'} data-speaking={isSpeaking ? 'true' : 'false'}>
      <button type="button" className="rukhsati-assistant-robot-button" style={{ left: position.x, top: position.y }}
        aria-label="ديلي، مساعد رخصتي. انقر لسماع شرح الصفحة، أو اضغط مطولاً لتحريكه."
        title="انقر ليسمعك الشرح · اضغط مطولاً للتحريك"
        onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={finishDrag}
        onClick={handleRobotClick}>
        <FloatingRobot3D onReady={() => setRobot3dReady(true)} onError={() => setRobot3dReady(false)} />
        <span className="rukhsati-robot-stage" aria-hidden="true">
          <span className="rukhsati-robot-halo" />
          <span className="rukhsati-robot-orb">D</span>
        </span>
        <span className="rukhsati-robot-caption">{isSpeaking ? 'عم يحكي' : 'ديلي'}</span>
      </button>

      {showSuggestion && !isSpeaking && (
        <div className="rukhsati-assistant-suggestion" role="status" aria-live="polite"
          style={{ left: suggestionLeft, top: suggestionTop, width: suggestionWidth }}>
          <span>{speechError ?? (speechContext?.title ? `اضغط على ديلي لسماع ${speechContext.title}.` : `إذا احتجت مساعدة في ${activeTopic.title}، اضغط على ديلي.`)}</span>
          <button type="button" aria-label="إخفاء الاقتراح" onClick={() => setShowSuggestion(false)}>×</button>
        </div>
      )}
    </div>
  );
}
