import { useState } from 'react';

type Props = { src?: string | null; questionId?: number };

type Result = { code: string; message: string; details: string[] };

function result(code: string, message: string, details: string[]): Result {
  return { code, message, details };
}

async function diagnose(src: string): Promise<Result> {
  if (!src) return result('AUD-01', 'لا يوجد رابط صوت لهذا السؤال.', ['audioUrl فارغ أو غير موجود.']);

  let response: Response;
  try {
    response = await fetch(src, {
      headers: { Range: 'bytes=0-15' },
      credentials: 'omit',
      cache: 'no-store',
    });
  } catch (e) {
    return result('AUD-06', 'تعذر الوصول إلى ملف الصوت من المتصفح (غالباً CORS أو اتصال).', [
      `URL: ${src}`,
      `تفاصيل المتصفح: ${e instanceof Error ? e.message : String(e)}`,
    ]);
  }

  const type = response.headers.get('content-type') || '(غير موجود)';
  const length = response.headers.get('content-length') || '(غير موجود)';
  const range = response.headers.get('content-range') || '(غير موجود)';
  const serverBytes = response.headers.get('x-audio-bytes') || '(غير موجود)';

  if (response.status === 401 || response.status === 403) {
    return result('AUD-02', `الخادم رفض الوصول إلى الصوت (HTTP ${response.status}).`, [
      `Content-Type: ${type}`, `X-Audio-Bytes: ${serverBytes}`,
    ]);
  }
  if (response.status === 404) {
    return result('AUD-03', 'الخادم لا يجد ملف الصوت لهذا السؤال (404).', [`URL: ${src}`, `Content-Type: ${type}`]);
  }
  if (!response.ok && response.status !== 206) {
    return result('AUD-09', `الخادم أعاد HTTP ${response.status} عند طلب الصوت.`, [
      `Content-Type: ${type}`, `Content-Length: ${length}`,
    ]);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const mp3 = bytes.length >= 3 &&
    ((bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) ||
      (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0));

  if (!type.toLowerCase().startsWith('audio/')) {
    return result('AUD-04', 'الرابط يرجع محتوى ليس ملف صوت معروفاً.', [
      `HTTP: ${response.status}`, `Content-Type: ${type}`, `Content-Length: ${length}`,
      `Content-Range: ${range}`, `X-Audio-Bytes: ${serverBytes}`, `MP3 signature: ${mp3 ? 'نعم' : 'لا'}`,
    ]);
  }
  if (!mp3 || bytes.length === 0) {
    return result('AUD-04', 'الاستجابة فارغة أو ليست MP3 صالحاً.', [
      `HTTP: ${response.status}`, `البيانات المقروءة: ${bytes.length} bytes`,
      `Content-Type: ${type}`, `MP3 signature: ${mp3 ? 'نعم' : 'لا'}`,
      `X-Audio-Bytes: ${serverBytes}`,
    ]);
  }

  return new Promise(resolve => {
    const audio = new Audio();
    let done = false;
    const finish = (r: Result) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      audio.removeAttribute('src');
      audio.load();
      resolve(r);
    };
    const timer = window.setTimeout(() => finish(result('AUD-05',
      'الملف وصل، لكن المتصفح لم يؤكد إمكانية فكّه وتشغيله خلال 7 ثوانٍ.',
      [`HTTP: ${response.status}`, `Content-Type: ${type}`, `X-Audio-Bytes: ${serverBytes}`]
    )), 7000);
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => finish(result('AUD-00',
      'الصوت يصل من الخادم والمتصفح يتعرف عليه كملف قابل للتشغيل.',
      [`HTTP: ${response.status}`, `Content-Type: ${type}`,
       `المدة: ${Number.isFinite(audio.duration) ? audio.duration.toFixed(2) + ' ثانية' : 'غير معروفة'}`,
       `X-Audio-Bytes: ${serverBytes}`]
    ));
    audio.onerror = () => finish(result('AUD-05',
      'الملف وصل، لكن المتصفح فشل في تحميل أو فك ملف الصوت.',
      [`MediaError code: ${audio.error?.code ?? 'غير معروف'}`, `HTTP: ${response.status}`,
       `Content-Type: ${type}`, `X-Audio-Bytes: ${serverBytes}`]
    ));
    audio.src = src;
    audio.load();
  });
}

export default function AudioDiagnostics({ src, questionId }: Props) {
  const [busy, setBusy] = useState(false);
  const [r, setR] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  const run = async () => {
    setBusy(true); setCopied(false);
    try { setR(await diagnose(src || '')); }
    catch (e) { setR(result('AUD-99', 'خطأ داخل أداة التشخيص.', [e instanceof Error ? e.message : String(e)])); }
    finally { setBusy(false); }
  };

  const report = r ? [
    'رخصتي Audio Diagnostic', `Code: ${r.code}`,
    `Message: ${r.message}`, questionId ? `Question ID: ${questionId}` : '',
    ...r.details
  ].filter(Boolean).join('\n') : '';

  return <div className="audio-diagnostics" dir="rtl">
    <button type="button" className="audio-diagnostic-button" onClick={() => void run()} disabled={busy}>
      {busy ? 'جارٍ فحص الصوت…' : '🧪 تشخيص الصوت'}
    </button>
    {r && <div className={`audio-diagnostic-result ${r.code === 'AUD-00' ? 'ok' : 'bad'}`}>
      <strong>{r.code}</strong><span>{r.message}</span><small>{r.details.join(' • ')}</small>
      <button type="button" onClick={() => { void navigator.clipboard?.writeText(report); setCopied(true); }}>
        {copied ? 'تم النسخ' : 'نسخ التقرير'}
      </button>
    </div>}
  </div>;
}
