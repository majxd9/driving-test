import { useEffect, useMemo, useRef, useState } from 'react';
import { api, resolveApiUrl } from '../api/client';

type MediaType = 'image' | 'audio';

const imageProviders = [
  ['gemini', 'Gemini'],
  ['huggingface', 'Hugging Face / fal-ai'],
  ['edenai', 'Eden AI'],
  ['comfyui', 'ComfyUI'],
] as const;

const audioProviders = [
  ['fish', 'Fish Audio'],
  ['elevenlabs', 'ElevenLabs'],
  ['edenai', 'Eden AI'],
  ['local', 'Local TTS'],
] as const;

function statusLabel(status: string) {
  return {
    Pending: 'بالانتظار',
    Processing: 'قيد التوليد',
    Succeeded: 'جاهز للمراجعة',
    Failed: 'فشل',
    Approved: 'تم الاعتماد',
    Rejected: 'مرفوض',
  }[status] ?? status;
}

function providerLabel(provider: string) {
  return [...imageProviders, ...audioProviders].find(([id]) => id === provider)?.[1] ?? provider;
}

export default function AiGenerationLab() {
  const [type, setType] = useState<MediaType>('image');
  const [questionId, setQuestionId] = useState('1');
  const [imageProvider, setImageProvider] = useState('gemini');
  const [audioProvider, setAudioProvider] = useState('fish');
  const [run, setRun] = useState<import('../types').AiTestRun | null>(null);
  const [busy, setBusy] = useState(false);
  const [polling, setPolling] = useState(false);
  const [mediaSrc, setMediaSrc] = useState('');
  const pollRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (pollRef.current !== null) window.clearInterval(pollRef.current);
    if (mediaSrc) URL.revokeObjectURL(mediaSrc);
  }, [mediaSrc]);

  useEffect(() => {
    void api.admin.aiGenerationControl().then(control => {
      if (control.imageProvider && control.imageProvider !== 'none') {
        setImageProvider(control.imageProvider);
      }
    }).catch(() => undefined);
  }, []);

  const selectedProvider = type === 'image' ? imageProvider : audioProvider;

  const stopPolling = () => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setPolling(false);
  };

  const refreshRun = async (id: number) => {
    const latest = await api.admin.getAiTest(id);
    setRun(latest);
    if (latest.hasMedia && latest.mediaUrl) {
      const src = resolveApiUrl(latest.mediaUrl);
      setMediaSrc(current => {
        if (current && current !== src) URL.revokeObjectURL(current);
        return src;
      });
    }
    if (['Succeeded', 'Failed', 'Approved', 'Rejected'].includes(latest.status)) {
      stopPolling();
    }
    return latest;
  };

  const start = async () => {
    const id = Number(questionId);
    if (!Number.isInteger(id) || id < 1 || id > 397) {
      setRun({
        id: 0,
        questionId: id || 0,
        questionText: '',
        category: '',
        type: type === 'image' ? 'Image' : 'Audio',
        provider: selectedProvider,
        status: 'Failed',
        contentHash: '',
        prompt: '',
        negativePrompt: '',
        hasMedia: false,
        errorType: 'Validation',
        errorMessage: 'رقم السؤال يجب أن يكون بين 1 و397.',
        attempts: 0,
        createdAt: new Date().toISOString(),
      });
      return;
    }

    stopPolling();
    setBusy(true);
    setRun(null);
    setMediaSrc(current => {
      if (current) URL.revokeObjectURL(current);
      return '';
    });

    try {
      const created = await api.admin.startAiTest({
        questionId: id,
        type,
        provider: selectedProvider,
      });
      setRun(created);
      setPolling(true);
      pollRef.current = window.setInterval(() => {
        void refreshRun(created.id).catch(() => undefined);
      }, 1500);
      await refreshRun(created.id);
    } catch (e) {
      setRun({
        id: 0,
        questionId: id,
        questionText: '',
        category: '',
        type: type === 'image' ? 'Image' : 'Audio',
        provider: selectedProvider,
        status: 'Failed',
        contentHash: '',
        prompt: '',
        negativePrompt: '',
        hasMedia: false,
        errorType: e instanceof Error ? 'RequestError' : 'Unknown',
        errorMessage: e instanceof Error ? e.message : String(e),
        attempts: 0,
        createdAt: new Date().toISOString(),
      });
    } finally {
      setBusy(false);
    }
  };

  const approve = async () => {
    if (!run?.id) return;
    setBusy(true);
    try {
      const approved = await api.admin.approveAiTest(run.id);
      setRun(approved);
    } catch (e) {
      setRun(current => current ? ({
        ...current,
        status: 'Failed',
        errorType: 'ApprovalError',
        errorMessage: e instanceof Error ? e.message : String(e),
      }) : current);
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!run?.id) return;
    setBusy(true);
    try {
      const rejected = await api.admin.rejectAiTest(run.id);
      setRun(rejected);
      setMediaSrc(current => {
        if (current) URL.revokeObjectURL(current);
        return '';
      });
    } catch (e) {
      setRun(current => current ? ({
        ...current,
        errorType: 'RejectError',
        errorMessage: e instanceof Error ? e.message : String(e),
      }) : current);
    } finally {
      setBusy(false);
    }
  };

  const typeLabel = type === 'image' ? 'صورة' : 'صوت';
  const canReview = run?.status === 'Succeeded' && run.hasMedia;

  const promptTitle = useMemo(
    () => type === 'image' ? 'البرومبت المستخدم فعلياً' : 'نص الصوت المستخدم فعلياً',
    [type],
  );

  return (
    <div className="ai-test-lab">
      <div className="ai-test-lab-head">
        <div>
          <p>AI TEST LAB</p>
          <b>مختبر التوليد والتجربة</b>
          <small>اختبار سؤال واحد فقط. لا يدخل إلى الطابور العام ولا يغيّر الصورة أو الصوت الموجود إلا بعد الضغط على «اعتماد».</small>
        </div>
        <span className="status warn">بدون توليد جماعي</span>
      </div>

      <div className="ai-test-switch">
        <button type="button" className={type === 'image' ? 'active' : ''} onClick={() => { stopPolling(); setType('image'); setRun(null); }}>🖼️ اختبار صورة</button>
        <button type="button" className={type === 'audio' ? 'active' : ''} onClick={() => { stopPolling(); setType('audio'); setRun(null); }}>🔊 اختبار صوت</button>
      </div>

      <div className="ai-test-form">
        <label>
          رقم السؤال
          <input type="number" min="1" max="397" value={questionId} onChange={e => setQuestionId(e.target.value)} />
        </label>

        {type === 'image' ? (
          <label>
            مزود الصور
            <select value={imageProvider} onChange={e => { stopPolling(); setImageProvider(e.target.value); setRun(null); }}>
              {imageProviders.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>
        ) : (
          <label>
            مزود الصوت
            <select value={audioProvider} onChange={e => { stopPolling(); setAudioProvider(e.target.value); setRun(null); }}>
              {audioProviders.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>
        )}

        <button type="button" className="primary-cta" disabled={busy || polling} onClick={() => void start()}>
          {busy ? 'جارٍ بدء الاختبار…' : polling ? 'جارٍ التوليد بالخلفية…' : `اختبار توليد ${typeLabel} الآن`}
        </button>
      </div>

      {run && (
        <div className="ai-test-result">
          <div className="ai-test-result-meta">
            <div>
              <span className={run.status === 'Failed' ? 'status off' : run.status === 'Succeeded' ? 'status warn' : 'status on'}>
                {statusLabel(run.status)}
              </span>
              <span className="ai-test-provider">المزوّد: <b>{providerLabel(run.provider)}</b></span>
              <span className="ai-test-provider">السؤال: <b>#{run.questionId}</b></span>
            </div>
            {run.status === 'Processing' && <small>الطلب يعمل على الخادم؛ إغلاق هذه الصفحة لا يعيد استخدام نتيجة قديمة.</small>}
          </div>

          {run.status === 'Failed' ? (
            <div className="ai-test-error">
              <strong>{run.errorType || 'ProviderError'}</strong>
              <p>{run.errorMessage || 'فشل التوليد بدون رسالة تفصيلية.'}</p>
            </div>
          ) : (
            <>
              {run.hasMedia && mediaSrc && (
                <div className="ai-test-media">
                  {run.type === 'Image'
                    ? <img src={mediaSrc} alt={run.questionText} />
                    : <audio controls preload="metadata" src={mediaSrc} />}
                </div>
              )}

              {run.status === 'Succeeded' && (
                <div className="ai-test-actions">
                  <button type="button" className="primary-cta" disabled={busy} onClick={() => void approve()}>✓ اعتماد واستخدام في الموقع</button>
                  <button type="button" className="danger" disabled={busy} onClick={() => void reject()}>✕ رفض وحذف</button>
                </div>
              )}

              {run.status === 'Approved' && (
                <div className="ai-provider-message ok"><b>تم الاعتماد بنجاح.</b> أصبحت النتيجة محفوظة في المسار الرسمي لهذا السؤال.</div>
              )}
              {run.status === 'Rejected' && (
                <div className="ai-provider-message problem"><b>تم الرفض.</b> النتيجة التجريبية حُذفت ولم نغيّر النتيجة الرسمية.</div>
              )}

              <div className="ai-test-prompt">
                <b>{promptTitle}</b>
                <pre>{run.prompt}</pre>
                {run.negativePrompt && (
                  <details>
                    <summary>Negative prompt</summary>
                    <pre>{run.negativePrompt}</pre>
                  </details>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
