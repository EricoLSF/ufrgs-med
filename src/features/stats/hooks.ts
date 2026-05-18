import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'

export function useOverallStats() {
  return useLiveQuery(
    async () => {
      const all = await db.attempts.toArray()
      if (!all.length) return { count: 0, accuracy: 0, avgTime: 0 }
      const count = all.length
      const correct = all.reduce((s, a) => s + a.isCorrect, 0)
      const totalTime = all.reduce((s, a) => s + (a.timeMs ?? 0), 0)
      return { count, accuracy: correct / count, avgTime: Math.round(totalTime / count / 1000) }
    },
    [],
    { count: 0, accuracy: 0, avgTime: 0 },
  )
}

export function useStreak() {
  return useLiveQuery(
    async () => {
      const dates = new Set<string>()
      await db.attempts.each((a) => dates.add(a.attemptedAt.slice(0, 10)))
      if (!dates.size) return 0
      let streak = 0
      const today = new Date()
      for (let i = 0; i < 365; i++) {
        const d = new Date(today)
        d.setDate(today.getDate() - i)
        const iso = d.toISOString().slice(0, 10)
        if (dates.has(iso)) streak++
        else if (i > 0) break
      }
      return streak
    },
    [],
    0,
  )
}

export function useDueCount() {
  return useLiveQuery(
    () => db.srs.where('dueAt').belowOrEqual(new Date().toISOString()).count(),
    [],
    0,
  )
}

export interface SubjectStat {
  subjectId: number
  name: string
  color: string
  count: number
  accuracy: number | null
}

export function usePerSubjectStats(): SubjectStat[] {
  return (
    useLiveQuery(
      async (): Promise<SubjectStat[]> => {
        const [subjects, attempts, questions] = await Promise.all([
          db.subjects.orderBy('displayOrder').toArray(),
          db.attempts.toArray(),
          db.questions.toArray(),
        ])
        const qMap = new Map(questions.map((q) => [q.id!, q]))
        return subjects.map((s) => {
          const subjAttempts = attempts.filter((a) => qMap.get(a.questionId)?.subjectId === s.id)
          const count = subjAttempts.length
          const correct = subjAttempts.reduce((sum, a) => sum + a.isCorrect, 0)
          return {
            subjectId: s.id!,
            name: s.name,
            color: s.color,
            count,
            accuracy: count ? correct / count : null,
          }
        })
      },
      [],
    ) ?? []
  )
}

export interface ActivityCell { date: string; count: number }

export function useActivity(days = 84): ActivityCell[] {
  return (
    useLiveQuery(
      async (): Promise<ActivityCell[]> => {
        const counts = new Map<string, number>()
        await db.attempts.each((a) => {
          const d = a.attemptedAt.slice(0, 10)
          counts.set(d, (counts.get(d) ?? 0) + 1)
        })
        const out: ActivityCell[] = []
        const today = new Date()
        for (let i = days - 1; i >= 0; i--) {
          const d = new Date(today)
          d.setDate(today.getDate() - i)
          const iso = d.toISOString().slice(0, 10)
          out.push({ date: iso, count: counts.get(iso) ?? 0 })
        }
        return out
      },
      [days],
    ) ?? []
  )
}

export interface ConfidenceBucket { confidence: 1 | 2 | 3; n: number; accuracy: number | null }

export function useConfidenceCalibration(): ConfidenceBucket[] {
  return (
    useLiveQuery(
      async (): Promise<ConfidenceBucket[]> => {
        const all = await db.attempts.toArray()
        const buckets: Record<1 | 2 | 3, { n: number; correct: number }> = {
          1: { n: 0, correct: 0 },
          2: { n: 0, correct: 0 },
          3: { n: 0, correct: 0 },
        }
        for (const a of all) {
          if (a.confidence) {
            buckets[a.confidence].n++
            buckets[a.confidence].correct += a.isCorrect
          }
        }
        return ([1, 2, 3] as const).map((c) => ({
          confidence: c,
          n: buckets[c].n,
          accuracy: buckets[c].n ? buckets[c].correct / buckets[c].n : null,
        }))
      },
      [],
    ) ?? []
  )
}
