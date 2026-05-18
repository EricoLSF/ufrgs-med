import Dexie, { type Table } from 'dexie'
import type {
  Attempt,
  Note,
  Question,
  SRSState,
  Session,
  Setting,
  Subject,
  Topic,
} from './schema'
import { defaultSubjects } from './seed'

export class AppDB extends Dexie {
  subjects!: Table<Subject, number>
  topics!: Table<Topic, number>
  questions!: Table<Question, number>
  sessions!: Table<Session, number>
  attempts!: Table<Attempt, number>
  notes!: Table<Note, number>
  srs!: Table<SRSState, number>
  settings!: Table<Setting, string>

  constructor() {
    super('ufrgs-med')
    this.version(1).stores({
      subjects: '++id, &name, displayOrder',
      topics: '++id, subjectId, parentId, [subjectId+parentId], name',
      questions:
        '++id, &externalId, subjectId, topicId, year, source, difficulty, *tags, isFavorite, isArchived, needsReview, createdAt',
      sessions: '++id, type, startedAt',
      attempts:
        '++id, sessionId, questionId, attemptedAt, [sessionId+attemptedAt], [questionId+attemptedAt]',
      notes: 'questionId, updatedAt',
      srs: 'questionId, dueAt, state',
      settings: 'key',
    })

    this.on('populate', async (tx) => {
      await tx.table<Subject>('subjects').bulkAdd(defaultSubjects)
    })
  }
}

export const db = new AppDB()
