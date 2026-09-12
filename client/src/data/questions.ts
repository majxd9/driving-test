import rawQuestions from './questions.json';
import type { Question, QuestionCategory } from '../types';

const questions = rawQuestions as Question[];

export function getBundledQuestions(category: QuestionCategory): Question[] {
  return questions
    .filter((q) => q.category === category)
    .map((q) => ({ ...q, options: [...q.options] }));
}

export function getAllBundledQuestions(): Question[] {
  return questions.map((q) => ({ ...q, options: [...q.options] }));
}
