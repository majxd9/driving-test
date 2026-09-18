import { forwardRef } from 'react';

const DRIFT_CAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 420" fill="none" aria-hidden="true">
<defs>
<linearGradient id="dc-body" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#76f6e1"/><stop offset=".22" stop-color="#25d7c0"/><stop offset=".58" stop-color="#147eb8"/><stop offset="1" stop-color="#061b35"/></linearGradient>
<linearGradient id="dc-glass" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#2e5871"/><stop offset=".55" stop-color="#10283a"/><stop offset="1" stop-color="#050e18"/></linearGradient>
<linearGradient id="dc-carbon" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#0a1721"/><stop offset=".5" stop-color="#02070c"/><stop offset="1" stop-color="#0a1721"/></linearGradient>
<linearGradient id="dc-led" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#ffffff"/><stop offset=".28" stop-color="#dffffb"/><stop offset=".7" stop-color="#69f5df"/><stop offset="1" stop-color="#2dd4bf"/></linearGradient>
<radialGradient id="dc-lamp"><stop stop-color="#ffffff"/><stop offset=".28" stop-color="#e8fffd"/><stop offset=".62" stop-color="#62f4de" stop-opacity=".45"/><stop offset="1" stop-color="#2dd4bf" stop-opacity="0"/></radialGradient>
<filter id="dc-shadow" x="-25%" y="-35%" width="150%" height="190%"><feDropShadow dx="0" dy="22" stdDeviation="18" flood-color="#000" flood-opacity=".45"/><feDropShadow dx="0" dy="0" stdDeviation="9" flood-color="#2dd4bf" flood-opacity=".18"/></filter>
<filter id="dc-blur"><feGaussianBlur stdDeviation="13"/></filter>
<filter id="dc-soft"><feGaussianBlur stdDeviation="5"/></filter>
</defs>
<ellipse cx="350" cy="385" rx="235" ry="19" fill="#02070b" opacity=".55"/>
<path d="M185 275L18 356L210 305Z" fill="#dffffb" opacity=".20" filter="url(#dc-blur)"/>
<path d="M515 275L682 356L490 305Z" fill="#dffffb" opacity=".20" filter="url(#dc-blur)"/>
<path d="M190 277L38 342L205 300Z" fill="#eaffff" opacity=".16"/>
<path d="M510 277L662 342L495 300Z" fill="#eaffff" opacity=".16"/>
<g filter="url(#dc-shadow)">
<path d="M78 302c5-91 54-142 149-164l50-78c15-23 38-35 73-35s58 12 73 35l50 78c95 22 144 73 149 164l-18 43H96z" fill="url(#dc-body)" stroke="#b9fff5" stroke-width="6"/>
<path d="M143 184c63-30 132-45 207-45s144 15 207 45" stroke="#d9fffb" stroke-width="3" opacity=".23"/>
<path d="M190 151c48-17 102-25 160-25s112 8 160 25" stroke="#7af0e1" stroke-width="4" opacity=".22"/>
<path d="M203 136l38-59c10-16 25-24 47-26h124c22 2 37 10 47 26l38 59H203z" fill="url(#dc-glass)" stroke="#8df4e9" stroke-width="5"/>
<path d="M350 54v78M285 57l-10 75M415 57l10 75" stroke="#63d9e1" stroke-width="3" opacity=".34"/>
<path d="M240 86c30-22 68-31 110-31s80 9 110 31" stroke="#d8fffc" stroke-width="3" opacity=".12"/>
<path d="M103 238c33-40 78-59 133-63l114 0 114 0c55 4 100 23 133 63l-5 88H108z" fill="url(#dc-carbon)" stroke="#68e5df" stroke-width="4"/>
<path d="M150 300c33-30 69-42 113-44h174c44 2 80 14 113 44l-8 39H158z" fill="#030a11" stroke="#24576e" stroke-width="4"/>
<path d="M215 309h270l-14 22H229z" fill="#081d29" stroke="#38bcae" stroke-width="3" opacity=".85"/>
<ellipse cx="164" cy="259" rx="76" ry="44" fill="url(#dc-lamp)" opacity=".60" filter="url(#dc-soft)"/>
<path d="M122 258c17-23 45-36 80-40l28 18c-18 26-48 43-91 42z" fill="#effffe" stroke="#9efff1" stroke-width="4"/>
<path d="M137 258c24-12 46-19 70-22" stroke="url(#dc-led)" stroke-width="7" stroke-linecap="round"/>
<path d="M140 272c23-2 46-9 67-23" stroke="#b9fff8" stroke-width="3" opacity=".58"/>
<ellipse cx="536" cy="259" rx="76" ry="44" fill="url(#dc-lamp)" opacity=".60" filter="url(#dc-soft)"/>
<path d="M578 258c-17-23-45-36-80-40l-28 18c18 26 48 43 91 42z" fill="#effffe" stroke="#9efff1" stroke-width="4"/>
<path d="M563 258c-24-12-46-19-70-22" stroke="url(#dc-led)" stroke-width="7" stroke-linecap="round"/>
<path d="M560 272c-23-2-46-9-67-23" stroke="#b9fff8" stroke-width="3" opacity=".58"/>
<path d="M280 264h140l18 66H262z" fill="#040b12" stroke="#2c697b" stroke-width="4"/>
<path d="M292 285h116M300 300h100M309 315h82" stroke="#1d4454" stroke-width="3" opacity=".9"/>
<path d="M322 272h56" stroke="#70e8da" stroke-width="4" stroke-linecap="round" opacity=".62"/>
<path d="M205 226c43-14 93-21 145-21s102 7 145 21" stroke="#89fff0" stroke-width="4" opacity=".28"/>
<path d="M247 351h206" stroke="#7bf1e4" stroke-width="7" stroke-linecap="round" opacity=".55"/>
<circle cx="134" cy="345" r="29" fill="#061019" stroke="#28495c" stroke-width="8"/><circle cx="134" cy="345" r="10" fill="#2dd4bf" opacity=".72"/>
<circle cx="566" cy="345" r="29" fill="#061019" stroke="#28495c" stroke-width="8"/><circle cx="566" cy="345" r="10" fill="#2dd4bf" opacity=".72"/>
<path d="M92 320h516" stroke="#eaffff" stroke-width="3" opacity=".13"/>
<path d="M192 177c-38 10-64 23-87 43" stroke="#cafff8" stroke-width="3" opacity=".18"/>
<path d="M508 177c38 10 64 23 87 43" stroke="#cafff8" stroke-width="3" opacity=".18"/>
</g></svg>`;

const DriftCarArt = forwardRef<HTMLDivElement>(function DriftCarArt(_, ref) {
  return <div ref={ref} className="models-drift-vehicle-v10" dangerouslySetInnerHTML={{ __html: DRIFT_CAR_SVG }} />;
});

export default DriftCarArt;
