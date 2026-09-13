import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const files = [
  path.join(ROOT, 'client', 'src', 'data', 'questions.json'),
  path.join(ROOT, 'server', 'Data', 'SeedData', 'questions.json'),
];

const CANONICAL = {
  traffic: new Set([...Array.from({ length: 131 }, (_, i) => i + 1), 200, 201, 202, 203, 204, 205]),
  mechanic: new Set(Array.from({ length: 26 }, (_, i) => i + 210)),
};

const normalize = value => String(value ?? '')
  .normalize('NFKC')
  .replace(/\s+/g, ' ')
  .trim();

const imageNumber = src => {
  const sign = normalize(src).match(/(?:^|\/)sign_(\d+)\.(?:webp|png|jpe?g)$/i);
  if (sign) return { type: 'sign', number: Number(sign[1]) };
  const mechanic = normalize(src).match(/(?:^|\/)mechanic\/mechanic_(\d+)\.(?:webp|png|jpe?g)$/i);
  if (mechanic) return { type: 'mechanic', number: Number(mechanic[1]) };
  return null;
};

const errors = [];
const warnings = [];
let firstQuestions = null;

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  let questions;
  try { questions = JSON.parse(raw); }
  catch (e) { errors.push(`${file}: invalid JSON (${e.message})`); continue; }
  if (!Array.isArray(questions)) { errors.push(`${file}: root must be an array`); continue; }

  if (!firstQuestions) firstQuestions = questions;
  const seen = new Map();

  questions.forEach((q, idx) => {
    const label = `${path.relative(ROOT, file)}#${idx + 1} (id=${q.id ?? '?'})`;
    if (!['Ser', 'Ishara', 'Mechanic'].includes(q.category)) errors.push(`${label}: invalid category`);
    if (!normalize(q.text)) errors.push(`${label}: empty question text`);
    if (!Array.isArray(q.options) || q.options.length !== 4) errors.push(`${label}: expected exactly 4 options`);
    if (Array.isArray(q.options)) {
      const opts = q.options.map(normalize);
      if (opts.some(x => !x)) errors.push(`${label}: empty option`);
      if (new Set(opts).size !== opts.length) errors.push(`${label}: duplicate option text`);
      if (!Number.isInteger(q.correctAnswerIndex) || q.correctAnswerIndex < 0 || q.correctAnswerIndex >= opts.length)
        errors.push(`${label}: invalid correctAnswerIndex`);
    }

    const textKey = `${q.category}|${normalize(q.text)}|${JSON.stringify((q.options ?? []).map(normalize))}`;
    if (seen.has(textKey)) errors.push(`${label}: duplicate of question index ${seen.get(textKey)}`);
    else seen.set(textKey, idx + 1);

    const src = normalize(q.imageUrl);
    if (q.category === 'Ishara' && !src) errors.push(`${label}: sign question has no imageUrl`);
    if (src) {
      const parsed = imageNumber(src);
      if (!parsed) errors.push(`${label}: unsupported image path ${src}`);
      else if (parsed.type === 'sign' && !CANONICAL.traffic.has(parsed.number) && !CANONICAL.mechanic.has(parsed.number)) errors.push(`${label}: non-canonical sign image ${src}`);
      else if (parsed.type === 'mechanic' && !CANONICAL.mechanic.has(parsed.number)) errors.push(`${label}: non-canonical mechanic image ${src}`);
      if (parsed?.number >= 236 && parsed?.number <= 245) errors.push(`${label}: forbidden legacy image ${src}`);
    }
  });

  console.log(`AUDIT ${path.relative(ROOT, file)}: ${questions.length} questions`);
}

if (firstQuestions) {
  const byKey = new Map(firstQuestions.map(q => [q.id, q]));
  const otherRaw = fs.readFileSync(files[1], 'utf8');
  const other = JSON.parse(otherRaw);
  for (const q of other) {
    const peer = byKey.get(q.id);
    if (!peer) continue;
    if (normalize(peer.text) !== normalize(q.text)) warnings.push(`id=${q.id}: client/server question text differs`);
    if (normalize(peer.imageUrl) !== normalize(q.imageUrl)) warnings.push(`id=${q.id}: client/server image differs`);
  }
}

console.log(`WARNINGS: ${warnings.length}`);
for (const warning of warnings.slice(0, 50)) console.log(`  - ${warning}`);
console.log(`ERRORS: ${errors.length}`);
for (const error of errors.slice(0, 100)) console.log(`  - ${error}`);

if (errors.length) process.exit(1);
console.log('Question-bank audit passed.');
