export type QuestionCategory = 'Ser' | 'Ishara' | 'Mechanic';

export interface Question {
  id: number;
  category: QuestionCategory;
  text: string;
  options: string[];
  correctAnswerIndex: number;
  explanation?: string;
  imageUrl?: string;
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
