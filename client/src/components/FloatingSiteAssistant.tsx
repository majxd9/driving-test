import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { resolveApiUrl } from '../api/client';
import './floating-site-assistant.css';

type GuideTopic = {
  id: string;
  title: string;
  summary: string;
  text: string;
  audioKey: string;
  path: string;
  action: string;
};

const topics: GuideTopic[] = [
  {
    id: 'welcome',
    title: 'ابدأ من هنا',
    summary: 'جولة سريعة في رخصتي',
    text: 'أهلاً بك في رخصتي. اختر أحد أقسام التدريب لمراجعة قواعد السير أو الإشارات المرورية أو أساسيات الميكانيك، ويمكنك فتح نماذج الاختبار لمحاكاة الامتحان.',
    audioKey: 'site-guide-welcome',
    path: '/app',
    action: 'افتح الصفحة الرئيسية',
  },
  {
    id: 'training',
    title: 'التدريب والمراجعة',
    summary: 'السؤال والإجابة والتفسير',
    text: 'ابدأ من قسم التدريب، واختر قواعد السير أو الإشارات المرورية أو الميكانيك. اقرأ السؤال والصورة، ثم اختر الإجابة وراجع التفسير قبل الانتقال إلى السؤال التالي.',
    audioKey: 'site-guide-training',
    path: '/study/Ser',
    action: 'افتح التدريب',
  },
  {
    id: 'signs',
    title: 'الإشارات المرورية',
    summary: 'افهم شكل الإشارة ومعناها',
    text: 'في قسم الإشارات المرورية، افحص شكل الإشارة ولونها ورمزها قبل اختيار المعنى. تظهر لك المراجعة بعد الإجابة لتتعلم من الخطأ.',
    audioKey: 'site-guide-signs',
    path: '/study/Ishara',
    action: 'افتح الإشارات',
  },
  {
    id: 'exam',
    title: 'محاكاة الاختبار',
    summary: 'النماذج والوقت والنتيجة',
    text: 'من زر اختيار النموذج، افتح أحد نماذج الاختبار. يتكوّن الاختبار من ثلاثين سؤالاً خلال خمس عشرة دقيقة، ثم تظهر لك النتيجة ومراجعة الإجابات.',
    audioKey: 'site-guide-exam',
    path: '/models',
    action: 'اختر نموذج اختبار',
  },
  {
    id: 'practical',
    title: 'المعلومات العملية',
    summary: 'أضواء السيارة والغمازات',
    text: 'قسم المعلومات العملية يشرح أساسيات استخدام أضواء السيارة والغمازات، مع عناصر تفاعلية تساعدك على التعرف على الحالات وطريقة الاستخدام.',
    audioKey: 'site-guide-practical',
    path: '/practical-info',
    action: 'افتح المعلومات العملية',
  },
  {
    id: 'car',
    title: 'استعراض السيارة 3D',
    summary: 'التدوير والتقريب والأجزاء',
    text: 'في استعراض السيارة ثلاثية الأبعاد، اختر السيارة من القائمة، واسحب لتدويرها، واستخدم التكبير والتصغير لرؤية التفاصيل. اختر قسماً لعرض الأجزاء الرئيسية.',
    audioKey: 'site-guide-car',
    path: '/car-viewer',
    action: 'استعرض السيارة',
  },
];

export default function FloatingSiteAssistant() {
  const [open, setOpen] = useState(false);
  const [activeTopicId, setActiveTopicId] = useState('welcome');
  const [status, setStatus] = useState('اختر موضوعاً لقراءة الشرح أو الاستماع إليه.');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const generationRef = useRef(0);
  const fallbackRef = useRef(-1);
  const navigate = useNavigate();
  const location = useLocation();

  // Avoid overlapping important exam controls, the admin dashboard, result review,
  // and the car viewer (which already has its own dedicated guide).
  const hiddenOnRoute =
    location.pathname === '/admin' ||
    location.pathname.startsWith('/exam/') ||
    location.pathname === '/result' ||
    location.pathname === '/car-viewer';

  const stopSpeech = (announce = true) => {
    generationRef.current += 1;
    fallbackRef.current = -1;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.onplaying = null;
      audio.onended = null;
      audio.onerror = null;
      audio.removeAttribute('src');
      audio.load();
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    if (announce) setStatus('تم إيقاف الصوت.');
  };

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'none';
    audioRef.current = audio;
    return () => {
      generationRef.current += 1;
      audio.pause();
      audio.removeAttribute('src');
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!hiddenOnRoute) return;
    setOpen(false);
    stopSpeech(false);
  }, [hiddenOnRoute]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      stopSpeech(false);
      setOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  const playTopic = (topic: GuideTopic) => {
    const request = ++generationRef.current;
    fallbackRef.current = -1;
    setActiveTopicId(topic.id);
    setIsSpeaking(true);
    setStatus('جارٍ تجهيز الشرح الصوتي…');

    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.onplaying = null;
      audio.onended = null;
      audio.onerror = null;
      audio.removeAttribute('src');
      audio.load();
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    const speakOnDevice = () => {
      if (request !== generationRef.current || fallbackRef.current === request) return;
      fallbackRef.current = request;

      if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
        setIsSpeaking(false);
        setStatus('الصوت غير متاح على هذا الجهاز حالياً؛ يمكنك قراءة الشرح الظاهر.');
        return;
      }

      const utterance = new SpeechSynthesisUtterance(topic.text);
      utterance.lang = 'ar-SA';
      utterance.rate = 0.95;
      const voices = window.speechSynthesis.getVoices();
      const arabicVoice = voices.find((voice) => /^ar([_-]|$)/i.test(voice.lang));
      if (arabicVoice) utterance.voice = arabicVoice;

      utterance.onstart = () => {
        if (request === generationRef.current) {
          setIsSpeaking(true);
          setStatus('الصوت المولّد غير متاح؛ يعمل صوت الجهاز الآن.');
        }
      };
      utterance.onend = () => {
        if (request !== generationRef.current) return;
        setIsSpeaking(false);
        setStatus('انتهى الشرح الصوتي.');
      };
      utterance.onerror = () => {
        if (request !== generationRef.current) return;
        setIsSpeaking(false);
        setStatus('تعذّر تشغيل الصوت؛ يمكنك قراءة الشرح الظاهر.');
      };

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    };

    if (!audio) {
      speakOnDevice();
      return;
    }

    audio.onplaying = () => {
      if (request === generationRef.current) setStatus('يعمل ملف الشرح الصوتي.');
    };
    audio.onended = () => {
      if (request !== generationRef.current) return;
      setIsSpeaking(false);
      setStatus('انتهى الشرح الصوتي.');
    };
    audio.onerror = speakOnDevice;
    audio.src = resolveApiUrl('/api/questions/audio-prompt/' + encodeURIComponent(topic.audioKey) + '?v=20261010');
    audio.load();

    try {
      const playback = audio.play();
      if (playback) void playback.catch(speakOnDevice);
    } catch {
      speakOnDevice();
    }
  };

  const activeTopic = topics.find((topic) => topic.id === activeTopicId) ?? topics[0];

  if (hiddenOnRoute) return null;

  return (
    <div className="rukhsati-site-assistant" dir="rtl">
      <button
        type="button"
        className="rukhsati-assistant-trigger"
        aria-expanded={open}
        aria-controls="rukhsati-assistant-panel"
        onClick={() => {
          if (open) {
            stopSpeech();
            setOpen(false);
          } else {
            setOpen(true);
          }
        }}
      >
        <span className="rukhsati-assistant-avatar" aria-hidden="true">
          <svg viewBox="0 0 40 40" fill="none">
            <path d="M20 6V3.5M16.5 3.5h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <rect x="7" y="9" width="26" height="23" rx="8" stroke="currentColor" strokeWidth="1.8" />
            <path d="M3.5 17v7M36.5 17v7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            <rect x="12" y="15" width="5" height="5" rx="2.5" fill="#83eadb" />
            <rect x="23" y="15" width="5" height="5" rx="2.5" fill="#83eadb" />
            <path d="M14 25h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="20" cy="3.5" r="1.7" fill="#efbd76" />
          </svg>
        </span>
        <span className="rukhsati-assistant-trigger-copy">
          <strong>مساعد رخصتي</strong>
          <small>شرح الموقع بالصوت</small>
        </span>
        <span className="rukhsati-assistant-live" aria-hidden="true" />
      </button>

      {open && (
        <section
          id="rukhsati-assistant-panel"
          className="rukhsati-assistant-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="rukhsati-assistant-title"
        >
          <header className="rukhsati-assistant-header">
            <span className="rukhsati-assistant-header-avatar" aria-hidden="true">
              <svg viewBox="0 0 40 40" fill="none">
                <rect x="7" y="10" width="26" height="22" rx="8" stroke="currentColor" strokeWidth="1.8" />
                <path d="M20 10V5M16.5 5h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="15" cy="20" r="2.2" fill="#83eadb" />
                <circle cx="25" cy="20" r="2.2" fill="#83eadb" />
                <path d="M14 26h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
            <div>
              <span className="rukhsati-assistant-kicker">دليل تفاعلي</span>
              <h2 id="rukhsati-assistant-title">كيف أساعدك؟</h2>
            </div>
            <button
              type="button"
              className="rukhsati-assistant-close"
              aria-label="إغلاق المساعد"
              onClick={() => {
                stopSpeech(false);
                setOpen(false);
              }}
            >
              ×
            </button>
          </header>

          <div className="rukhsati-assistant-content">
            <div className="rukhsati-assistant-explanation" aria-live="polite">
              <strong>{activeTopic.title}</strong>
              <p>{activeTopic.text}</p>
            </div>

            <div className="rukhsati-assistant-topics" role="group" aria-label="مواضيع المساعدة">
              {topics.map((topic) => (
                <button
                  type="button"
                  key={topic.id}
                  className="rukhsati-assistant-topic"
                  data-active={activeTopicId === topic.id ? 'true' : 'false'}
                  aria-pressed={activeTopicId === topic.id}
                  onClick={() => playTopic(topic)}
                >
                  <span className="rukhsati-assistant-topic-mark" aria-hidden="true">
                    {activeTopicId === topic.id ? '▶' : '›'}
                  </span>
                  <span className="rukhsati-assistant-topic-copy">
                    <strong>{topic.title}</strong>
                    <small>{topic.summary}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <footer className="rukhsati-assistant-footer">
            <span className="rukhsati-assistant-status" role="status" aria-live="polite">{status}</span>
            <div className="rukhsati-assistant-actions">
              <button
                type="button"
                className="rukhsati-assistant-stop"
                disabled={!isSpeaking}
                onClick={() => stopSpeech()}
              >
                إيقاف الصوت
              </button>
              <button
                type="button"
                className="rukhsati-assistant-open-page"
                onClick={() => {
                  stopSpeech(false);
                  setOpen(false);
                  navigate(activeTopic.path);
                }}
              >
                {activeTopic.action}
              </button>
            </div>
          </footer>
        </section>
      )}
    </div>
  );
}
