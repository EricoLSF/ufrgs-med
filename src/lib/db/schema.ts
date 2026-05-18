export interface Subject {
  id?: number
  name: string
  color: string
  displayOrder: number
}

export interface Topic {
  id?: number
  subjectId: number
  parentId: number | null
  name: string
}

export interface Question {
  id?: number
  externalId?: string
  subjectId: number
  topicId: number | null
  year: number | null
  source: string | null
  difficulty: number | null
  statementMd: string
  alternatives: string[]
  correctAlt: number
  explanationMd: string | null
  tags: string[]
  isFavorite: 0 | 1
  isArchived: 0 | 1
  needsReview: 0 | 1
  createdAt: string
  updatedAt: string
}

export type SessionType = 'drill' | 'simulado' | 'srs' | 'quick'

export interface Session {
  id?: number
  type: SessionType
  configJson: string | null
  startedAt: string
  endedAt: string | null
}

export type Confidence = 1 | 2 | 3

export interface Attempt {
  id?: number
  sessionId: number | null
  questionId: number
  selectedAlt: number | null
  isCorrect: 0 | 1
  confidence: Confidence | null
  timeMs: number | null
  attemptedAt: string
}

export interface Note {
  questionId: number
  contentMd: string
  updatedAt: string
}

export type SRSGrade = 'again' | 'hard' | 'good' | 'easy'
export type SRSCardState = 0 | 1 | 2 | 3

export interface SRSState {
  questionId: number
  stability: number
  difficulty: number
  elapsedDays: number
  scheduledDays: number
  learningSteps: number
  reps: number
  lapses: number
  state: SRSCardState
  dueAt: string
  lastReviewedAt: string | null
}

export interface Setting {
  key: string
  value: string
}
