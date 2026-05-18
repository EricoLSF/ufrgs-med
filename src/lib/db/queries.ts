import { db } from './index'
import type { Attempt, Question, Session, SessionType } from './schema'

const now = () => new Date().toISOString()

export async function listSubjects() {
  return db.subjects.orderBy('displayOrder').toArray()
}

export async function listTopics(subjectId?: number) {
  return subjectId == null
    ? db.topics.orderBy('name').toArray()
    : db.topics.where({ subjectId }).sortBy('name')
}

export async function createQuestion(input: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>) {
  const t = now()
  return db.questions.add({ ...input, createdAt: t, updatedAt: t })
}

export async function updateQuestion(id: number, patch: Partial<Question>) {
  return db.questions.update(id, { ...patch, updatedAt: now() })
}

export async function createSession(type: SessionType, config: unknown = null) {
  const s: Session = {
    type,
    configJson: config == null ? null : JSON.stringify(config),
    startedAt: now(),
    endedAt: null,
  }
  return db.sessions.add(s)
}

export async function endSession(id: number) {
  return db.sessions.update(id, { endedAt: now() })
}

export async function recordAttempt(a: Omit<Attempt, 'id' | 'attemptedAt'>) {
  return db.attempts.add({ ...a, attemptedAt: now() })
}

export async function countQuestionsBySubject() {
  const counts = new Map<number, number>()
  await db.questions
    .where('isArchived')
    .equals(0)
    .each((q) => counts.set(q.subjectId, (counts.get(q.subjectId) ?? 0) + 1))
  return counts
}

export async function overallAccuracy() {
  const all = await db.attempts.toArray()
  if (!all.length) return null
  const correct = all.reduce((s, a) => s + a.isCorrect, 0)
  return correct / all.length
}
