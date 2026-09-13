import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const files = [
  path.join(ROOT, 'client', 'src', 'data', 'questions.json'),
  path.join(ROOT, 'server', 'Data', 'SeedData', 'questions.json'),
];
const PUBLIC = path.join(ROOT, 'client', 'public');

const CANONICAL = {
  traffic: new Set([...Array.from({ length: 131 }, (_, i) => i + 1), 200, 201, 202, 203, 204, 205]),
  mechanic: new Set(Array.from({ length: 26 }, (_, i) => i + 210)),
};

const normalize = value => String(value ?? '')
  .normalize('NFKC')
  .replace(/\s+/g, ' ')
  .trim();

const imageInfo = src => {
  const value = normalize(src);
  const sign = value.match(/^\/signs\/sign_(\d+)\.(?:webp|png|jpe?g)$/i);
  if (sign) return { type: 'sign', number: Number(sign[1]), relative: `signs/sign_${sign[1]}.${value.split('.').pop()}` };
  const mechanic = value.match(/^\/mechanic\/mechanic_(\d+)\.(?:webp|png|jpe?g)$/i);
  if (mechanic) return { type: 'mechanic', number: Number(mechanic[1]), relative: `mechanic/mechanic_${mechanic[1]}.${value.split('.').pop()}` };
  return null;
};

const expectedAsset = info => {
  if (!info) return null;
  if (info.type === 'sign' && info.number <= 214) return path.join(PUBLIC, 'signs', `sign_${info.number < 100 ? String(info.number).padStart(2, '0') : info.number}.webp`);
  if (info.type === 'mechanic' && info.number >= 215) return path.join(PUBLIC, 'mechanic', `mechanic_${info.number}.webp`);
  return null;
};

const errors = [];
const warnings = [];
const datasets = [];

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  let questions;
  try { questions = JSON.parse(raw); }
  catch (e) { errors.push(`${file}: invalid JSON (${e.message})`); continue; }
  if (!Array.isArray(questions)) { errors.push(`${file}: root must be an array`); continue; }

  datasets.push({ file, questions });
  const seen = new Map();
  const ids = new Set();

  questions.forEach((q, idx) => {
    const label = `${path.relative(ROOT, file)}#${idx + 1} (id=${q.id ?? '?'})`;
    if (!Number.isInteger(q.id)) errors.push(`${label}: invalid/missing id`);
    else if (ids.has(q.id)) errors.push(`${label}: duplicate id ${q.id}`);
    else ids.add(q.id);
    if (!['Ser', 'Ishara', 'Mechanic'].includes(q.category)) errors.push(`${label}: invalid category`);
    if (!normalize(q.text)) errors.push(`${label}: empty question text`);
    if (!Array.isArray(q.options) || q.options.length !== 4) errors.push(`${label}: expected exactly 4 options`);
    if (Array.isArray(q.options)) {
      const opts = q.options.map(normalize);
      if (opts.some(x => !x)) errors.push(`${label}: empty option`);
      if (new Set(opts).size !== opts.length) errors.push(`${label}: duplicate option text`);
      if (!Number.isInteger(q.correctAnswerIndex) || q.correctAnswerIndex < 0 || q.correctAnswerIndex >= opts.length) errors.push(`${label}: invalid correctAnswerIndex`);
    }

    const textKey = `${q.category}|${normalize(q.text)}|${JSON.stringify((q.options ?? []).map(normalize))}`;
    if (seen.has(textKey)) errors.push(`${label}: duplicate of question index ${seen.get(textKey)}`);
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
        if (parsed.number >= 236 && parsed.number <= 245) errors.push(`${label}: forbidden legacy image ${src}`);
        const asset = expectedAsset(parsed);
        if (!asset || !fs.existsSync(asset)) errors.push(`${label}: broken asset link ${src}`);
      }
    }
  });

  console.log(`AUDIT ${path.relative(ROOT, file)}: ${questions.length} questions`);
}

if (datasets.length === 2) {
  const [client, server] = datasets;
  const clientById = new Map(client.questions.map(q => [q.id, q]));
  const serverById = new Map(server.questions.map(q => [q.id, q]));
  for (const [id, q] of clientById) {
    const peer = serverById.get(id);
    if (!peer) errors.push(`id=${id}: missing from server seed data`);
    else {
      if (normalize(q.text) !== normalize(peer.text)) warnings.push(`id=${id}: client/server question text differs`);
      if (normalize(q.imageUrl) !== normalize(peer.imageUrl)) warnings.push(`id=${id}: client/server image differs`);
      if (q.correctAnswerIndex !== peer.correctAnswerIndex) warnings.push(`id=${id}: client/server correct answer differs`);
    }
  }
  for (const id of serverById.keys()) if (!clientById.has(id)) errors.push(`id=${id}: missing from client question data`);
}

console.log(`WARNINGS: ${warnings.length}`);
for (const warning of warnings.slice(0, 50)) console.log(`  - ${warning}`);
console.log(`ERRORS: ${errors.length}`);
for (const error of errors.slice(0, 100)) console.log(`  - ${error}`);

if (errors.length) process.exit(1);
console.log('Question-bank audit passed.');
