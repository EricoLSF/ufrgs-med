import { db } from './db'
import type {
  Attempt, Note, Question, SRSState, Session, Setting, Subject, Topic,
} from './db/schema'

export const EXPORT_VERSION = 1

export interface ExportPayload {
  version: number
  exportedAt: string
  subjects: Subject[]
  topics: Topic[]
  questions: Question[]
  sessions: Session[]
  attempts: Attempt[]
  notes: Note[]
  srs: SRSState[]
  settings: Setting[]
}

export async function exportAll(): Promise<ExportPayload> {
  const [subjects, topics, questions, sessions, attempts, notes, srs, settings] = await Promise.all([
    db.subjects.toArray(),
    db.topics.toArray(),
    db.questions.toArray(),
    db.sessions.toArray(),
    db.attempts.toArray(),
    db.notes.toArray(),
    db.srs.toArray(),
    db.settings.toArray(),
  ])
  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    subjects, topics, questions, sessions, attempts, notes, srs, settings,
  }
}

export function downloadJson(payload: ExportPayload, filename = `ufrgs-med-${payload.exportedAt.slice(0, 10)}.json`) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export interface ImportReport {
  questionsAdded: number
  questionsUpdated: number
  questionsSkipped: number
  subjectsAdded: number
}

export async function importQuestions(payload: ExportPayload): Promise<ImportReport> {
  const report: ImportReport = { questionsAdded: 0, questionsUpdated: 0, questionsSkipped: 0, subjectsAdded: 0 }

  await db.transaction('rw', db.subjects, db.questions, async () => {
    // map remote subjectId → local subjectId by name
    const localSubjects = await db.subjects.toArray()
    const byName = new Map(localSubjects.map((s) => [s.name, s.id!]))
    const subjectIdMap = new Map<number, number>()

    for (const s of payload.subjects) {
      let localId = byName.get(s.name)
      if (localId == null) {
        const newId = await db.subjects.add({ name: s.name, color: s.color, displayOrder: s.displayOrder })
        localId = Number(newId)
        report.subjectsAdded++
        byName.set(s.name, localId)
      }
      if (s.id != null) subjectIdMap.set(s.id, localId)
    }

    for (const q of payload.questions) {
      const subjectId = subjectIdMap.get(q.subjectId) ?? q.subjectId
      const remapped = { ...q, subjectId }
      delete (remapped as { id?: number }).id

      if (q.externalId) {
        const existing = await db.questions.where('externalId').equals(q.externalId).first()
        if (existing) {
          await db.questions.update(existing.id!, { ...remapped, updatedAt: new Date().toISOString() })
          report.questionsUpdated++
          continue
        }
      }
      await db.questions.add({ ...remapped, createdAt: q.createdAt ?? new Date().toISOString(), updatedAt: new Date().toISOString() })
      report.questionsAdded++
    }
  })

  return report
}

export async function resetDatabase() {
  await db.delete()
  location.reload()
}
