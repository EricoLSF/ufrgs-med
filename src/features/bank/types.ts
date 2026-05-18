import type { Question } from '@/lib/db/schema'

export type QuestionDraft = Omit<Question, 'id' | 'createdAt' | 'updatedAt'>

export function newDraft(subjectId: number): QuestionDraft {
  return {
    subjectId,
    topicId: null,
    year: null,
    source: 'user',
    difficulty: null,
    statementMd: '',
    alternatives: ['', '', '', '', ''],
    correctAlt: 0,
    explanationMd: null,
    tags: [],
    isFavorite: 0,
    isArchived: 0,
    needsReview: 0,
  }
}
