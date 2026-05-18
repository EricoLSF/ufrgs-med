import { createEmptyCard, fsrs, Rating, type Card, type Grade } from 'ts-fsrs'
import { db } from './db'
import type { Confidence, SRSState } from './db/schema'

const f = fsrs()

function toCard(s: SRSState): Card {
  return {
    due: new Date(s.dueAt),
    stability: s.stability,
    difficulty: s.difficulty,
    elapsed_days: s.elapsedDays,
    scheduled_days: s.scheduledDays,
    learning_steps: s.learningSteps,
    reps: s.reps,
    lapses: s.lapses,
    state: s.state,
    last_review: s.lastReviewedAt ? new Date(s.lastReviewedAt) : undefined,
  }
}

function fromCard(questionId: number, c: Card): SRSState {
  return {
    questionId,
    stability: c.stability,
    difficulty: c.difficulty,
    elapsedDays: c.elapsed_days,
    scheduledDays: c.scheduled_days,
    learningSteps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state as SRSState['state'],
    dueAt: c.due.toISOString(),
    lastReviewedAt: c.last_review ? c.last_review.toISOString() : null,
  }
}

export function gradeFromAttempt(isCorrect: boolean, confidence: Confidence | null): Grade {
  if (!isCorrect) return Rating.Again
  if (confidence === 1) return Rating.Hard
  if (confidence === 3) return Rating.Easy
  return Rating.Good
}

export async function reviewQuestion(questionId: number, grade: Grade, when: Date = new Date()) {
  const existing = await db.srs.get(questionId)
  const card = existing ? toCard(existing) : createEmptyCard(when)
  const { card: next } = f.next(card, when, grade)
  await db.srs.put(fromCard(questionId, next))
}
