export type QuestionCategory = 'Ser' | 'Ishara' | 'Mechanic';

export interface QuestionDiagram {
  type: 'svg' | 'image' | 'interactive';
  url: string;
  title?: string;
  description?: string;
}

export interface Question {
  id: number;
  category: QuestionCategory;
  text: string;
  options: string[];
  correctAnswerIndex: number;
  explanation?: string;
  imageUrl?: string | null;
  diagramType?: 'svg' | 'image' | 'interactive' | null;
  diagramUrl?: string | null;
  diagramTitle?: string | null;
  diagramDescription?: string | null;
}

export type QuestionUpsert = Omit<Question, "id">;

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

export interface Analytics {
  students: { total: number; active: number };
  questions: { total: number; byCategory: Record<QuestionCategory, number> };
  exams: { total: number; passed: number; passRate: number; averageScore: number };
  auth: { totalAttempts: number; successful: number; failed: number };
}
