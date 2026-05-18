import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './index'

export function useSubjects() {
  return useLiveQuery(() => db.subjects.orderBy('displayOrder').toArray(), [], [])
}

export function useQuestionCount() {
  return useLiveQuery(() => db.questions.where('isArchived').equals(0).count(), [], 0)
}

export function useTotalAttempts() {
  return useLiveQuery(() => db.attempts.count(), [], 0)
}
