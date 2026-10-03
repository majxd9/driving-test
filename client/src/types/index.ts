export type QuestionCategory = 'Ser' | 'Ishara' | 'Mechanic';

export interface Question {
  id: number;
  category: QuestionCategory;
  text: string;
  options: string[];
  correctAnswerIndex: number;
  explanation?: string | null;
  imageUrl?: string | null;
  diagramType?: 'svg' | 'image' | 'interactive' | null;
  diagramUrl?: string | null;
  diagramTitle?: string | null;
  diagramDescription?: string | null;
  audioUrl?: string | null;
  aiImageUrl?: string | null;
  audioGenerationStatus?: string | null;
  aiImageGenerationStatus?: string | null;
}

export interface LoginResponse {
  fullName: string;
  role: 'Admin' | 'Student';
  accessExpiresAt: string | null;
  questionCount: number;
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

export interface ExamQuestion {
  id: number;
  text: string;
  options: string[];
  correctAnswerIndex: number;
  explanation?: string | null;
  imageUrl?: string;
  diagramType?: 'svg' | 'image' | 'interactive' | null;
  diagramUrl?: string | null;
  diagramTitle?: string | null;
  diagramDescription?: string | null;
  audioUrl?: string | null;
  aiImageUrl?: string | null;
}

export interface ExamReviewQuestion {
  id: number;
  text: string;
  options: string[];
  correctAnswerIndex: number;
  chosenAnswerIndex: number | null;
  explanation?: string;
  imageUrl?: string;
  diagramType?: 'svg' | 'image' | 'interactive' | null;
  diagramUrl?: string | null;
  diagramTitle?: string | null;
  diagramDescription?: string | null;
  aiImageUrl?: string | null;
}

export interface ExamSubmission {
  id: number;
  modelId: number;
  correct: number;
  total: number;
  answered: number;
  wrongQuestionIds: number[];
  createdAt: string;
  reviewQuestions: ExamReviewQuestion[];
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

export interface AiGenerationCounts {
  missing: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  remaining: number;
  lastError?: string | null;
  lastErrorAt?: string | null;
}

export interface AiGenerationQuota {
  limit: number;
  used: number;
  remaining: number;
  monthStartUtc: string;
}

export interface AiGenerationControlState {
  audioEnabled: boolean;
  imageEnabled: boolean;
  imageProvider: 'none' | 'gemini' | 'huggingface' | 'edenai' | 'comfyui' | string;
  allEnabled: boolean;
  allDisabled: boolean;
}

export interface AiGenerationOverview {
  audioProvider: string;
  imageProvider: string;
  imageExecutionProvider: string;
  audioFallbackProvider: string;
  imageFallbackProvider: string;
  audio: AiGenerationCounts;
  image: AiGenerationCounts;
  quota: AiGenerationQuota;
}

export interface ImageProviderTestResult {
  provider: string;
  state: 'connected' | 'disabled' | 'unconfigured' | 'unsupported' | 'error' | 'timeout' | 'unreachable' | string;
  message: string;
  endpoint: string;
}

export interface AiGenerationEnqueueResult {
  created: number;
  requeued: number;
  skipped: number;
  failedRetried: number;
}

export interface CompletedAiImageItem {
  questionId: number;
  questionText: string;
  category: string;
  imageUrl: string;
  contentHash: string;
  createdAt: string;
}

export interface AiImageReviewItem {
  questionId: number;
  questionText: string;
  category: string;
  imageUrl: string;
  contentHash: string;
  createdAt: string;
  pendingCount: number;
  reviewedCount: number;
}
