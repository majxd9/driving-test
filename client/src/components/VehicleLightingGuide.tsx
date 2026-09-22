import { useState } from 'react';
type LightingMode = 'off' | 'parking' | 'low' | 'fog';
type Props = { questionText?: string };
const MODES = [
  { id:'off', label:'إطفاء الأنوار الأساسية', short:'إطفاء', image:'/vehicle-lights/light-off.svg', tip:'وضع الإطفاء في هذا المحاكي التعليمي. بعض السيارات قد تحتفظ بإضاءة نهارية أو إضاءة تلقائية حسب التجهيز.' },
  { id:'parking', label:'أنوار الموقف / الموضع', short:'مواقف', image:'/vehicle-lights/light-parking.svg', tip:'تُظهر أضواء الموضع وجود المركبة بشكل أوضح دون عرض نمط إضاءة الطريق نفسه مثل الضوء المنخفض.' },
  { id:'low', label:'الضوء المنخفض', short:'منخفض', image:'/vehicle-lights/light-low.svg', tip:'هذا هو الوضع الذي يوضّح إضاءة الطريق أمام المركبة بشكل واضح ومنضبط في المحاكاة.' },
  { id:'fog', label:'الضوء المنخفض + مصابيح الضباب', short:'ضباب', image:'/vehicle-lights/light-fog.svg', tip:'محاكاة لإضافة مصابيح الضباب إلى الإضاءة الأمامية. استخدام أضواء الضباب يعتمد على ظروف القيادة وتجهيز المركبة.' },
] as const;
function isLightingQuestion(text=''){ return /المصابيح|الأضواء|الإنارة|الضوء|الأنوار|ضباب/.test(text); }
function ModeGlyph({mode}:{mode:LightingMode}){ if(mode==='off') return <span className="vlg-glyph">0</span>; if(mode==='parking') return <span className="vlg-glyph">☼</span>; if(mode==='low') return <span className="vlg-glyph">◖</span>; return <span className="vlg-glyph">◖≋</span>; }
export default function VehicleLightingGuide({questionText=''}:Props){
  const [open,setOpen]=useState(false); const [mode,setMode]=useState<LightingMode>('low');
  if(!isLightingQuestion(questionText)) return null;
  const active=MODES.find(item=>item.id===mode) ?? MODES[2];
  return <>
    <button type="button" className="vehicle-lighting-launcher" onClick={()=>setOpen(true)} aria-label="فتح معلومات أضواء السيارة"><span aria-hidden="true">💡</span><span>معلومات إضافية</span><small>محاكي الأضواء</small></button>
    {open && <div className="vehicle-lighting-modal" role="dialog" aria-modal="true" aria-labelledby="vehicle-lighting-title" onClick={()=>setOpen(false)}>
      <div className="vehicle-lighting-sheet" onClick={event=>event.stopPropagation()}>
        <header className="vehicle-lighting-header"><div><span className="vehicle-lighting-kicker">توضيح تفاعلي</span><h2 id="vehicle-lighting-title">جرّب مفتاح الإضاءة</h2><p>اختر وضعاً من الأربعة وشاهد كيف يتغيّر شكل الإضاءة على السيارة.</p></div><button type="button" className="vehicle-lighting-close" onClick={()=>setOpen(false)} aria-label="إغلاق">×</button></header>
        <div className="vehicle-lighting-stage"><img key={active.image} src={active.image} alt={active.label}/><div className="vehicle-lighting-stage-badge"><span>الوضع الحالي</span><strong>{active.label}</strong></div></div>
        <div className="vehicle-lighting-dial" role="tablist" aria-label="أوضاع الإضاءة">{MODES.map(item=><button key={item.id} type="button" role="tab" aria-selected={mode===item.id} className={'vehicle-lighting-mode ' + (mode===item.id ? 'is-active':'')} onClick={()=>setMode(item.id)}><ModeGlyph mode={item.id}/><span>{item.short}</span></button>)}</div>
        <div className="vehicle-lighting-tip"><div className="vehicle-lighting-tip-icon">i</div><div><b>معلومة إضافية</b><p>{active.tip}</p></div></div>
        <div className="vehicle-lighting-note"><span>ⓘ</span><span>هذه الرسومات محاكاة بصرية تعليمية؛ شكل مفتاح الإضاءة والرموز قد يختلف بين موديلات السيارات.</span></div>
      </div>
    </div>}
  </>;
}
