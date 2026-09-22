import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type LightKey = 'position' | 'low' | 'high' | 'fog';

type LightMode = {
  key: LightKey;
  title: string;
  alias: string;
  short: string;
  why: string;
  when: string[];
  never: string[];
  steps: string[];
  legal: string;
  sceneTitle: string;
  sceneText: string;
};

function LightSymbol({ type, className = '' }: { type: LightKey; className?: string }) {
  const common = {
    viewBox: '0 0 88 56',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  };

  if (type === 'position') {
    return (
      <svg {...common}>
        <path d="M8 17h21c8 0 13 5 15 11H8V17Z" />
        <path d="M57 13h18M57 23h23M57 33h18" />
      </svg>
    );
  }

  if (type === 'low') {
    return (
      <svg {...common}>
        <path d="M8 13h20c8 0 14 6 16 15H8V13Z" />
        <path d="m57 14 18 9M57 24l22 8M57 34l18 3" />
      </svg>
    );
  }

  if (type === 'high') {
    return (
      <svg {...common}>
        <path d="M8 13h20c8 0 14 6 16 15H8V13Z" />
        <path d="M56 12h24M56 22h27M56 31h27M56 41h24" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M8 13h20c8 0 14 6 16 15H8V13Z" />
      <path d="m57 13 16 8M57 22h20M57 31l16-8" />
      <path d="M76 13c-8 6 7 8-1 14s7 9-1 16" />
    </svg>
  );
}

const LIGHTS: LightMode[] = [
  {
    key: 'position',
    title: 'أضواء جانبية',
    alias: 'أنوار القياس / الموضع',
    short: 'أظهر المركبة بوضوح',
    why: 'وظيفتها الأساسية أن تساعد على إظهار وجود المركبة وتحديد عرضها، وليست لإضاءة مسار القيادة لمسافة بعيدة.',
    when: [
      'للدلالة على وجود المركبة وأبعادها.',
      'أثناء الليل ضمن شروط استعمال الأنوار الواردة في قانون السير.',
      'عند الوقوف ليلاً على طريق تكون إنارته غير كافية، وفق شروط الوقوف.',
    ],
    never: [
      'لا تعتمد عليها وحدها عندما تحتاج فعلياً إلى إضاءة الطريق أمامك.',
      'لا تعتبرها بديلاً عن أنوار التلاقي أو الطريق.',
    ],
    steps: [
      'تعرّف على رمزها في سيارتك، لأن شكل مفتاح الإضاءة يختلف بين الطرازات.',
      'تأكد من ظهور الأنوار المطلوبة في مقدمة ومؤخرة المركبة بحسب تجهيزها.',
      'عندما تحتاج إلى رؤية الطريق، انتقل إلى وضع الإضاءة المناسب.',
    ],
    legal: 'المادة 68 تفرض تجهيز السيارة بأنوار جانبية لتحديد عرضها، والمادة 79 تنص على استعمال أنوار الجانبين أثناء الليل.',
    sceneTitle: 'الهدف هنا: أن تُرى',
    sceneText: 'الضوء محدود؛ الفكرة الأساسية هي حضور المركبة وليس إضاءة الطريق أمامها لمسافة القيادة.',
  },
  {
    key: 'low',
    title: 'الضوء المنخفض',
    alias: 'أنوار التلاقي',
    short: 'أنر طريقك من دون إبهار',
    why: 'ينير الطريق أمامك بحزمة منخفضة مناسبة للقيادة عندما يلزم تجنب إبهار السائقين الآخرين.',
    when: [
      'عندما تكون الرؤية غير كافية وتحتاج إلى إضاءة الطريق.',
      'عند التقابل مع مركبة أخرى ليلاً.',
      'عندما يكون استعمال الضوء العالي غير مناسب بسبب احتمال الإبهار.',
    ],
    never: [
      'لا ترفع الحزمة إلى العالي عند وجود مركبة مقابلة أو عندما يؤدي ذلك إلى إبهار الآخرين.',
      'لا تجعل اختيار الضوء عادة ثابتة؛ القرار مرتبط بالرؤية وحركة الطريق.',
    ],
    steps: [
      'شغّل وضع أنوار التلاقي من مفتاح الإضاءة.',
      'راقب الطريق والحركة المقابلة، وحافظ على الحزمة المنخفضة عندما يتطلب الموقف ذلك.',
      'عند تحسن الظروف، اختر الوضع الذي يطابق الرؤية وحالة الطريق.',
    ],
    legal: 'المواد 68 و78 تميّز بين أنوار التلاقي وأنوار الطريق، وتلزم باستخدام الحزمة المناسبة لتلافي إبهار الآخرين.',
    sceneTitle: 'الهدف هنا: أن ترى وتُراعي الآخرين',
    sceneText: 'الحزمة أقرب إلى سطح الطريق وأقل امتداداً من الضوء العالي لتقليل خطر الإبهار عند التقابل.',
  },
  {
    key: 'high',
    title: 'الضوء العالي',
    alias: 'أنوار الطريق',
    short: 'رؤية أبعد على الطريق المظلم',
    why: 'يوفر إضاءة أبعد للطريق عندما لا تكون الإنارة المحيطة كافية، لكن فائدته مرتبطة بعدم إبهار مستخدمي الطريق الآخرين.',
    when: [
      'عندما تكون الرؤية غير كافية للسير بأمان والطريق غير مضاءة بشكل كافٍ.',
      'عندما لا توجد مركبة مقابلة تتأثر بالحزمة العالية.',
      'على الطرق أو الظروف التي يسمح فيها القانون باستعمال أنوار الطريق.',
    ],
    never: [
      'لا تستخدمه عند التقابل مع مركبة أخرى.',
      'لا تستخدمه خلف مركبة تسير أمامك بمسافة قصيرة، مع الاستثناء القانوني للإشارة المتقطعة عند الاستعداد للتجاوز.',
      'يُمنع استخدامه في جميع الحالات التي قد يسبب فيها إبهاراً لمستعملي الطريق، وكذلك في المناطق المأهولة وفق المادة 78.',
    ],
    steps: [
      'تعرّف على رمز الضوء العالي، ولا تحفظ اتجاه ذراع واحد فقط لأن التصميم يختلف بين السيارات.',
      'شغّله فقط بعد التأكد من أن الحزمة لن تبهر سائقاً آخر.',
      'عند ظهور مركبة مقابلة أو دخولك حالة تتطلب الحزمة المنخفضة، عد إلى التلاقي فوراً.',
    ],
    legal: 'المادة 78 المعدلة بالمرسوم التشريعي 11 لعام 2008 تحدد استعمال أنوار الطريق وتمنعها عند التقابل، خلف مركبة قريبة، وعند احتمال إبهار مستعملي الطريق وفي المناطق المأهولة.',
    sceneTitle: 'الهدف هنا: رؤية أبعد — وليس إبهار الآخرين',
    sceneText: 'المشهد يوضح امتداد الحزمة العالية، ومع اقتراب مركبة مقابلة تصبح الأولوية لتلافي الإبهار.',
  },
  {
    key: 'fog',
    title: 'أضواء الضباب',
    alias: 'لضعف الرؤية',
    short: 'تعامل مع الرؤية الصعبة',
    why: 'هي أضواء خاصة في مقدمة المركبة تساعد في ظروف ضعف الرؤية مثل الضباب والعاصفة الرملية بحسب تعريف القانون.',
    when: [
      'عند وجود ضباب وتعذر الرؤية بوضوح.',
      'في ظروف ضعف الرؤية التي تستوجب تجهيزات الإضاءة الخاصة بحسب السيارة والقانون.',
      'مع تخفيض السرعة وملاءمة القيادة للظروف؛ الضوء وحده لا يحل مشكلة الرؤية.',
    ],
    never: [
      'لا تعتمد عليها وحدها إذا كانت ظروف الطريق تتطلب تغيير السرعة أو أسلوب القيادة.',
      'لا تستخدم أي ضوء لمجرد وجوده؛ الغرض هو تحسين الرؤية مع تجنب إبهار الآخرين.',
    ],
    steps: [
      'تعرّف على رمز مصباح الضباب في سيارتك قبل القيادة في الأجواء الصعبة.',
      'شغّله عندما تستدعي حالة الرؤية ذلك، وبما يتوافق مع تجهيز السيارة والقانون.',
      'بعد تحسن الرؤية، أعد الإضاءة إلى الوضع المناسب للحالة الجديدة.',
    ],
    legal: 'المادة 71 تعرف أنوار الضباب كأنوار خاصة في مقدمة السيارة، والمادة 78 تنص على استعمال أنوار الطريق والضباب عند وجود ضباب وتعذر الرؤية بوضوح.',
    sceneTitle: 'الهدف هنا: الرؤية في ظروف صعبة',
    sceneText: 'الحزمة تُعرض قريبة من سطح الطريق مع طبقة ضباب توضح لماذا تختلف عن العالي.',
  },
];

const MINI_CHECKS = [
  {
    q: 'أنت على طريق مظلم، ولا توجد مركبة مقابلة أو قريبة منك. ما الفكرة التي تسمح بتذكر الضوء العالي؟',
    options: ['رؤية أبعد عندما تكون الظروف مناسبة', 'إظهار أبعاد السيارة فقط', 'استخدامه دائماً داخل المناطق المأهولة'],
    correct: 0,
    note: 'المادة 78 تربط أنوار الطريق بضعف الرؤية وتضع حالات واضحة لمنعها.',
  },
  {
    q: 'ظهرت مركبة مقابلة ليلاً. ما التصرف التعليمي الأهم؟',
    options: ['رفع الضوء أكثر', 'تلافي إبهار السائق والانتقال للحزمة المناسبة', 'إطفاء جميع الأنوار'],
    correct: 1,
    note: 'القانون يمنع استعمال أنوار الطريق عند التقابل ويطلب إطفاءها بما يسمح للسائق الآخر بالمتابعة بسهولة.',
  },
  {
    q: 'ما الهدف الأساسي من أنوار الجانبين؟',
    options: ['إضاءة الطريق لمسافة 100 متر', 'تحديد عرض ووجود المركبة', 'إضاءة الضباب'],
    correct: 1,
    note: 'المادة 68 تذكرها لتحديد عرض السيارة، والمادة 79 تتناول استعمالها ليلاً.',
  },
  {
    q: 'ما العبارة الأدق عن الضباب؟',
    options: ['الضباب يجعل السرعة لا علاقة لها بالرؤية', 'الأضواء وحدها تكفي دائماً', 'تتحسن السلامة باختيار الإضاءة المناسبة وملاءمة القيادة لضعف الرؤية'],
    correct: 2,
    note: 'المادة 78 تذكر استعمال أنوار الطريق والضباب عند تعذر الرؤية بوضوح.',
  },
];

export default function PracticalInfo() {
  const navigate = useNavigate();
  const [activeKey, setActiveKey] = useState<LightKey>('high');
  const [checkIndex, setCheckIndex] = useState(0);
  const [selectedCheck, setSelectedCheck] = useState<number | null>(null);
  const active = useMemo(() => LIGHTS.find(item => item.key === activeKey) ?? LIGHTS[2], [activeKey]);
  const check = MINI_CHECKS[checkIndex];

  const selectLight = (key: LightKey) => {
    setActiveKey(key);
    setSelectedCheck(null);
  };

  return (
    <div className="practical-info-page" dir="rtl">
      <header className="practical-info-header">
        <div className="practical-info-header-inner">
          <button className="practical-back" type="button" onClick={() => navigate('/')} aria-label="العودة إلى الرئيسية">
            <span>→</span>
          </button>
          <div className="practical-brand">
            <span>مركز المعرفة العملية</span>
            <strong>معلومات عملية إضافية</strong>
          </div>
          <div className="practical-header-badge"><span>01</span> أضواء السيارة</div>
        </div>
      </header>

      <main className="practical-info-main">
        <section className="practical-hero">
          <div className="practical-hero-copy">
            <span className="practical-eyebrow">وحدة تعليمية تفاعلية</span>
            <h1>افهم الأضواء <em>بالمشهد، لا بالحفظ فقط.</em></h1>
            <p>
              تعرّف على رمز كل ضوء، شاهد تأثيره على الطريق، ثم راجع متى تستخدمه ومتى يجب أن تعود إلى الوضع المنخفض.
              هذا القسم مصمم ليكبر لاحقاً ليشمل الغمازات والأزرار ووظائف السيارة العملية.
            </p>
            <div className="practical-hero-stats">
              <div><b>04</b><span>أوضاع رئيسية</span></div>
              <div><b>01</b><span>مشهد تفاعلي</span></div>
              <div><b>∞</b><span>قابل للتوسعة</span></div>
            </div>
          </div>
          <div className="practical-hero-visual" aria-hidden="true">
            <div className="hero-dashboard-ring ring-a" />
            <div className="hero-dashboard-ring ring-b" />
            <div className="hero-dashboard-panel">
              <div className="hero-speed">LIGHTS</div>
              <div className="hero-icon"><LightSymbol type="high" /></div>
              <div className="hero-bars"><i /><i /><i /><i /></div>
            </div>
            <span className="hero-orbit-dot dot-a" />
            <span className="hero-orbit-dot dot-b" />
          </div>
        </section>

        <section className="practical-light-picker" aria-labelledby="lights-picker-title">
          <div className="practical-section-title">
            <div>
              <span className="practical-eyebrow">الموضوع 01</span>
              <h2 id="lights-picker-title">اختر الضوء</h2>
            </div>
            <p>تبديل واحد يغيّر الرمز، المشهد، والشرح بالكامل.</p>
          </div>

          <div className="practical-light-tabs" role="tablist" aria-label="أوضاع أضواء السيارة">
            {LIGHTS.map(item => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={activeKey === item.key}
                className={activeKey === item.key ? 'is-active' : ''}
                onClick={() => selectLight(item.key)}
              >
                <span className="tab-icon"><LightSymbol type={item.key} /></span>
                <span className="tab-copy">
                  <b>{item.title}</b>
                  <small>{item.alias}</small>
                  <em>{item.short}</em>
                </span>
                <i className="tab-state">{activeKey === item.key ? '✓' : String(LIGHTS.indexOf(item) + 1).padStart(2, '0')}</i>
              </button>
            ))}
          </div>
        </section>

        <section className={`practical-learning-grid mode-${active.key}`}>
          <div className="practical-scene" aria-label={active.sceneTitle}>
            <div className="scene-topline">
              <span>المحاكاة البصرية</span>
              <b>{active.title}</b>
            </div>
            <div className="scene-sky">
              <span className="scene-moon" />
              <i className="scene-star star-a" />
              <i className="scene-star star-b" />
              <i className="scene-star star-c" />
              <div className="scene-haze" />
            </div>
            <div className="scene-road">
              <span className="road-line left" />
              <span className="road-line right" />
              <span className="road-dash dash-a" />
              <span className="road-dash dash-b" />
              <span className="road-dash dash-c" />
            </div>
            <div className="scene-car">
              <div className="scene-car-roof" />
              <div className="scene-car-window left" />
              <div className="scene-car-window right" />
              <div className="scene-car-body" />
              <span className="scene-lamp lamp-left" />
              <span className="scene-lamp lamp-right" />
            </div>
            <div className="scene-beam beam-main" />
            <div className="scene-beam beam-wide" />
            <div className="scene-presence-dot p-left" />
            <div className="scene-presence-dot p-right" />
            <div className="scene-oncoming">
              <span />
              <span />
              <b>مركبة مقابلة</b>
            </div>
            <div className="scene-caption">
              <strong>{active.sceneTitle}</strong>
              <span>{active.sceneText}</span>
            </div>
          </div>

          <aside className="practical-control-card">
            <div className="control-head">
              <div>
                <span className="practical-eyebrow">الرمز أولاً</span>
                <h3>{active.title}</h3>
                <p>{active.alias}</p>
              </div>
              <div className="symbol-large"><LightSymbol type={active.key} /></div>
            </div>

            <div className="control-stalk" aria-hidden="true">
              <div className="stalk-body">
                <div className="stalk-grip" />
                <div className="stalk-collar">
                  <b>OFF</b>
                  <span>◌</span>
                  <span>◉</span>
                  <span>◉◉</span>
                </div>
                <div className="stalk-ticks"><i /><i /><i /><i /></div>
              </div>
              <div className="stalk-note">
                <span>ملاحظة بصرية</span>
                <b>احفظ الرمز ووظيفته؛ شكل الذراع واتجاهاته قد تختلف من سيارة لأخرى.</b>
              </div>
            </div>

            <div className="control-why">
              <span>لماذا نستخدمه؟</span>
              <strong>{active.why}</strong>
            </div>
          </aside>
        </section>

        <section className="practical-details" aria-label="تفاصيل الضوء">
          <article className="detail-card when">
            <div className="detail-icon">◷</div>
            <div>
              <span>متى أستخدمه؟</span>
              <h3>المواقف التي يجب أن تتعرف عليها</h3>
              <div className="detail-list">
                {active.when.map((item, index) => (
                  <div key={item}><b>{String(index + 1).padStart(2, '0')}</b><span>{item}</span></div>
                ))}
              </div>
            </div>
          </article>

          <article className="detail-card do">
            <div className="detail-icon">✓</div>
            <div>
              <span>تطبيق عملي</span>
              <h3>خطوات سهلة قبل القيادة</h3>
              <div className="detail-list">
                {active.steps.map((item, index) => (
                  <div key={item}><b>{String(index + 1).padStart(2, '0')}</b><span>{item}</span></div>
                ))}
              </div>
            </div>
          </article>

          <article className="detail-card avoid">
            <div className="detail-icon">!</div>
            <div>
              <span>تجنّب</span>
              <h3>متى لا تستخدمه بهذه الصورة؟</h3>
              <div className="detail-list compact">
                {active.never.map((item, index) => (
                  <div key={item}><b>{index === 0 ? '!' : '↺'}</b><span>{item}</span></div>
                ))}
              </div>
            </div>
          </article>

          <article className="detail-card legal">
            <div className="detail-icon">§</div>
            <div>
              <span>مرجع قانوني</span>
              <h3>قاعدة السير السورية</h3>
              <p>{active.legal}</p>
            </div>
          </article>
        </section>

        <section className="practical-memory">
          <div className="memory-copy">
            <span className="practical-eyebrow">طريقة الحفظ</span>
            <h2>أربع وظائف، أربع صور ذهنية</h2>
            <p>فكّر بالهدف أولاً: هل تريد أن تُرى؟ أن ترى؟ أن ترى أبعد؟ أم تتعامل مع ضعف الرؤية؟</p>
          </div>
          <div className="memory-grid">
            {LIGHTS.map(item => (
              <button
                key={item.key}
                type="button"
                className={activeKey === item.key ? 'is-active' : ''}
                onClick={() => selectLight(item.key)}
              >
                <span className="memory-icon"><LightSymbol type={item.key} /></span>
                <b>{item.key === 'position' ? 'أظهرني' : item.key === 'low' ? 'أنر طريقي' : item.key === 'high' ? 'أنر أبعد' : 'تعامل مع الضباب'}</b>
                <small>{item.title}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="practical-check">
          <div className="check-intro">
            <span className="practical-eyebrow">تأكد أنك فهمت</span>
            <h2>اختبار سريع من داخل الدرس</h2>
            <p>السؤال هنا للتأكد من الفهم، وليس جزءاً من نتيجة اختبار الرخصة.</p>
            <div className="check-rule">
              <span>قاعدة</span>
              <b>اختيار الضوء يبدأ من ظروف الطريق، وليس من قوة الضوء فقط.</b>
            </div>
          </div>

          <div className="check-card">
            <div className="check-top">
              <span>{String(checkIndex + 1).padStart(2, '0')} / {String(MINI_CHECKS.length).padStart(2, '0')}</span>
              <b>فهمت؟ جرّب</b>
            </div>
            <h3>{check.q}</h3>
            <div className="check-options">
              {check.options.map((option, index) => {
                const state = selectedCheck === null
                  ? ''
                  : index === check.correct
                    ? 'is-correct'
                    : index === selectedCheck
                      ? 'is-wrong'
                      : 'is-muted';
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={selectedCheck !== null}
                    className={state}
                    onClick={() => setSelectedCheck(index)}
                  >
                    <span>{['أ', 'ب', 'ج'][index]}</span>
                    <b>{option}</b>
                    {selectedCheck !== null && index === check.correct && <i>✓</i>}
                  </button>
                );
              })}
            </div>

            {selectedCheck !== null && (
              <div className={`check-feedback ${selectedCheck === check.correct ? 'good' : 'bad'}`}>
                <strong>{selectedCheck === check.correct ? 'إجابة صحيحة' : 'راجع المعلومة'}</strong>
                <span>{selectedCheck === check.correct ? 'ممتاز. حافظ على ربط الرمز بظرف الاستخدام.' : check.note}</span>
              </div>
            )}

            <button
              className="check-next"
              type="button"
              onClick={() => {
                setCheckIndex(index => (index + 1) % MINI_CHECKS.length);
                setSelectedCheck(null);
              }}
            >
              {checkIndex === MINI_CHECKS.length - 1 ? 'إعادة المجموعة' : 'السؤال التالي'} <span>←</span>
            </button>
          </div>
        </section>

        <footer className="practical-source-note">
          <div>
            <b>أساس المحتوى القانوني</b>
            <span>قانون السير والمركبات رقم 31 لعام 2004، مع تعديل المادة 78 بالمرسوم التشريعي رقم 11 لعام 2008.</span>
          </div>
          <small>
            هذه وحدة تعليمية. تفاصيل تشغيل مفتاح الإضاءة تختلف بين الطرازات؛ اعتمد أيضاً على دليل المركبة عند الحاجة.
          </small>
        </footer>
      </main>
    </div>
  );
}
