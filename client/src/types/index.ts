export type QuestionCategory = 'Ser' | 'Ishara' | 'Mechanic';

export interface Question {
  id: number;
  category: QuestionCategory;
  text: string;
  options: string[];
  correctAnswerIndex: number;
  explanation?: string;
  imageUrl?: string;
  diagramType?: 'svg' | 'image' | 'interactive' | null;
  diagramUrl?: string | null;
  diagramTitle?: string | null;
  diagramDescription?: string | null;
}

export interface LoginResponse {
  fullName: string;
  role: 'Admin' | 'Student';
  accessExpiresAt: string | null;
}

export interface Student {
  id: string;
  userName: string;
  fullName: string;
  isActive: boolean;
  deviceBound: boolean;
  accessExpiresAt: string | null;
  createdAt: string;
  attemptCount: number;
  passCount: number;
}

export interface AuthLog {
  id: number;
  userId: string | null;
  attemptedUserName: string;
  timestamp: string;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  reason: string;
}

export interface ExamAttempt {
  id: number;
  modelId: number;
  correct: number;
  total: number;
  answered: number;
  wrongQuestionIds: number[];
  createdAt: string;
}

export interface Analytics {
  students: { total: number; active: number };
  questions: { total: number; byCategory: Record<QuestionCategory, number> };
  media: { totalReferenced: number };
  exams: { total: number; passed: number; passRate: number; averageScore: number };
  auth: { totalAttempts: number; successful: number; failed: number };
  topQuestions: { questionId: number; category: QuestionCategory; text: string; attempts: number; correct: number; accuracy: number }[];
}
