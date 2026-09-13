import rawQuestions from './questions.json';
import type { Question, QuestionCategory } from '../types';

const questions = rawQuestions as Question[];

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function dedupeQuestions(items: Question[]): Question[] {
  const seen = new Set<string>();
  const result: Question[] = [];

  for (const question of items) {
    // Sign questions all use the same generic wording, so their sign/diagram
    // identity is part of the key. For theory and mechanic sections, the
    // normalized question text is enough to remove repeated questions.
    const visualKey = question.category === 'Ishara'
      ? `${question.imageUrl ?? ''}|${question.diagramUrl ?? ''}|${question.options.join('\u001f')}`
      : '';
    const key = `${question.category}|${normalizeText(question.text)}|${visualKey}`;

    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ ...question, options: [...question.options] });
  }

  return result;
}

export function getBundledQuestions(category: QuestionCategory): Question[] {
  return dedupeQuestions(questions.filter((q) => q.category === category));
}

export function getAllBundledQuestions(): Question[] {
  return dedupeQuestions(questions);
}
