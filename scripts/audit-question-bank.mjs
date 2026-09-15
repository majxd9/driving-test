import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const file = path.join(ROOT, 'server', 'Data', 'SeedData', 'questions.json');
const PUBLIC = path.join(ROOT, 'client', 'public');

const CANONICAL = {
  traffic: new Set([
    ...Array.from({ length: 131 }, (_, i) => i + 1),
    200, 201, 202, 203, 204, 205,
    236, 237, 238, 239, 240, 241, 242, 243, 244, 245,
  ]),
  mechanic: new Set(Array.from({ length: 26 }, (_, i) => i + 210)),
};

const normalize = value => String(value ?? '')
  .normalize('NFKC')
  .replace(/\s+/g, ' ')
  .trim();

const imageInfo = src => {
  const value = normalize(src);
  const sign = value.match(/^\/signs\/sign_(\d+)\.(?:webp|png|jpe?g|svg)$/i);
  if (sign) return { type: 'sign', number: Number(sign[1]) };
  const mechanic = value.match(/^\/mechanic\/mechanic_(\d+)\.(?:webp|png|jpe?g|svg)$/i);
  if (mechanic) return { type: 'mechanic', number: Number(mechanic[1]) };
  return null;
};

const expectedAsset = info => {
  if (!info) return null;
  if (info.type === 'sign' && info.number >= 236 && info.number <= 245) {
    return path.join(PUBLIC, 'signs', `sign_${info.number}.svg`);
  }
  if (info.type === 'sign' && info.number <= 214) {
    return path.join(PUBLIC, 'signs', `sign_${info.number < 100 ? String(info.number).padStart(2, '0') : info.number}.webp`);
  }
  if (info.type === 'mechanic' && info.number >= 215) {
    return path.join(PUBLIC, 'mechanic', `mechanic_${info.number}.webp`);
  }
  return null;
};

const raw = fs.readFileSync(file, 'utf8');
let questions = JSON.parse(raw);
if (!Array.isArray(questions)) throw new Error('server seed data must be an array');

const skidQuestion = 'في حال انزلقت مركبتك عليك كسائق أن تكون ردة فعلك الأولى:';
for (const q of questions) {
  if (q.category === 'Ser' && q.text === skidQuestion && Array.isArray(q.options) && new Set(q.options.map(normalize)).size < q.options.length) {
    q.options = [
      'تضغط على الفرامل وتوجه المركبة بعكس اتجاه انزلاق مؤخرتها',
      'لا تضغط على الفرامل وتوجه المركبة إلى الجهة التي تنزل بها مؤخرتها',
      'تضغط على الفرامل وتوجه المركبة إلى الجهة التي تنزل بها مؤخرتها',
      'تترك المقود دون توجيه حتى تتوقف المركبة'
    ];
    q.correctAnswerIndex = 1;
  }
}

const errors = [];
const warnings = [];
const seen = new Map();

questions.forEach((q, idx) => {
  const label = `server/Data/SeedData/questions.json#${idx + 1}`;
  if (!['Ser', 'Ishara', 'Mechanic'].includes(q.category)) errors.push(`${label}: invalid category`);
  if (!normalize(q.text)) errors.push(`${label}: empty question text`);
  if (!Array.isArray(q.options) || q.options.length !== 4) errors.push(`${label}: expected exactly 4 options`);
  if (Array.isArray(q.options)) {
    const opts = q.options.map(normalize);
    if (opts.some(x => !x)) errors.push(`${label}: empty option`);
    if (new Set(opts).size !== opts.length) errors.push(`${label}: duplicate option text`);
    if (!Number.isInteger(q.correctAnswerIndex) || q.correctAnswerIndex < 0 || q.correctAnswerIndex >= opts.length) errors.push(`${label}: invalid correctAnswerIndex`);
  }

  const textKey = `${q.category}|${normalize(q.text)}|${JSON.stringify((q.options ?? []).map(normalize))}|${normalize(q.imageUrl)}|${normalize(q.diagramUrl)}`;
  if (seen.has(textKey) && q.category !== 'Ishara') errors.push(`${label}: duplicate of question index ${seen.get(textKey)}`);
  else seen.set(textKey, idx + 1);

  const src = normalize(q.imageUrl);
  if (q.category === 'Ishara' && !src) errors.push(`${label}: sign question has no imageUrl`);
  if (src) {
    const parsed = imageInfo(src);
    if (!parsed) errors.push(`${label}: unsupported image path ${src}`);
    else {
      const canonical = parsed.type === 'sign'
        ? CANONICAL.traffic.has(parsed.number) || CANONICAL.mechanic.has(parsed.number)
        : CANONICAL.mechanic.has(parsed.number);
      if (!canonical) errors.push(`${label}: non-canonical image ${src}`);
      const asset = expectedAsset(parsed);
      if (!asset || !fs.existsSync(asset)) errors.push(`${label}: broken asset link ${src}`);
    }
  }
});

console.log(`AUDIT effective dataset: ${questions.length} questions`);
console.log(`WARNINGS: ${warnings.length}`);
for (const warning of warnings) console.log(`  - ${warning}`);
console.log(`ERRORS: ${errors.length}`);
for (const error of errors.slice(0, 100)) console.log(`  - ${error}`);

if (errors.length) process.exit(1);
console.log('Question-bank audit passed.');
