import { create } from 'zustand'
import { db } from '@/lib/db'
import { exportAll, type ExportPayload } from '@/lib/io'
import * as api from './api'
import { clearToken, requestToken } from './auth'
import type { DriveSettings, SyncStatus } from './types'

interface SyncStore extends SyncStatus {
  settings: DriveSettings
  setSettings: (patch: Partial<DriveSettings>) => Promise<void>
  setStatus: (s: SyncStatus) => void
}

const DEFAULT_SETTINGS: DriveSettings = {
  clientId: null, fileId: null, lastSyncAt: null, remoteModifiedTime: null,
}

const SETTINGS_KEY = 'drive'

async function readSettings(): Promise<DriveSettings> {
  const row = await db.settings.get(SETTINGS_KEY)
  if (!row) return { ...DEFAULT_SETTINGS }
  try { return { ...DEFAULT_SETTINGS, ...(JSON.parse(row.value) as DriveSettings) } }
  catch { return { ...DEFAULT_SETTINGS } }
}

async function writeSettings(s: DriveSettings) {
  await db.settings.put({ key: SETTINGS_KEY, value: JSON.stringify(s) })
}

export const useSync = create<SyncStore>((set, get) => ({
  state: 'disabled',
  settings: { ...DEFAULT_SETTINGS },
  setStatus: (s) => set(s),
  setSettings: async (patch) => {
    const next = { ...get().settings, ...patch }
    await writeSettings(next)
    set({ settings: next, lastSyncAt: next.lastSyncAt })
  },
}))

// Load persisted settings once.
let loaded = false
export async function loadDriveSettings(): Promise<DriveSettings> {
  const s = await readSettings()
  useSync.setState({ settings: s, lastSyncAt: s.lastSyncAt, state: s.clientId ? 'idle' : 'disabled' })
  loaded = true
  return s
}

export async function connect(clientId: string, opts: { silent?: boolean } = {}) {
  if (!loaded) await loadDriveSettings()
  useSync.getState().setStatus({ state: 'connecting' })
  try {
    await requestToken(clientId, opts)
    const file = await api.findOrCreate()
    const cur = useSync.getState().settings
    await useSync.getState().setSettings({
      clientId,
      fileId: file.id,
      remoteModifiedTime: file.modifiedTime,
      // keep lastSyncAt as-is so we trigger a pull if remote is newer
      lastSyncAt: cur.lastSyncAt,
    })
    useSync.getState().setStatus({ state: 'idle' })
  } catch (e) {
    useSync.getState().setStatus({ state: 'error', message: (e as Error).message })
    throw e
  }
}

export async function disconnect() {
  clearToken()
  await useSync.getState().setSettings({ clientId: null, fileId: null, lastSyncAt: null, remoteModifiedTime: null })
  useSync.getState().setStatus({ state: 'disabled' })
}

export async function pull(): Promise<boolean> {
  const { settings } = useSync.getState()
  if (!settings.clientId || !settings.fileId) return false
  useSync.getState().setStatus({ state: 'syncing', message: 'baixando…' })
  try {
    const meta = await api.metadata(settings.fileId)
    if (settings.lastSyncAt && meta.modifiedTime === settings.lastSyncAt) {
      useSync.getState().setStatus({ state: 'idle' })
      return false
    }
    const text = await api.download(settings.fileId)
    if (!text.trim()) {
      // remote is empty (first connect, new file) — nothing to pull
      useSync.getState().setStatus({ state: 'idle' })
      return false
    }
    const payload = JSON.parse(text) as ExportPayload
    await replaceLocalDb(payload)
    await useSync.getState().setSettings({ lastSyncAt: meta.modifiedTime, remoteModifiedTime: meta.modifiedTime })
    useSync.getState().setStatus({ state: 'idle' })
    return true
  } catch (e) {
    useSync.getState().setStatus({ state: 'error', message: (e as Error).message })
    return false
  }
}

export async function push(): Promise<void> {
  const { settings } = useSync.getState()
  if (!settings.clientId || !settings.fileId) return
  useSync.getState().setStatus({ state: 'syncing', message: 'enviando…' })
  try {
    const payload = await exportAll()
    const file = await api.upload(settings.fileId, JSON.stringify(payload))
    await useSync.getState().setSettings({ lastSyncAt: file.modifiedTime, remoteModifiedTime: file.modifiedTime })
    useSync.getState().setStatus({ state: 'idle' })
  } catch (e) {
    useSync.getState().setStatus({ state: 'error', message: (e as Error).message })
  }
}

async function replaceLocalDb(payload: ExportPayload) {
  await Promise.all([
    db.questions.clear(), db.attempts.clear(), db.sessions.clear(),
    db.topics.clear(), db.notes.clear(), db.srs.clear(), db.subjects.clear(),
  ])

  const subjMap = new Map<number, number>()
  for (const s of payload.subjects) {
    const id = await db.subjects.add({ name: s.name, color: s.color, displayOrder: s.displayOrder })
    if (s.id != null) subjMap.set(s.id, Number(id))
  }

  const qMap = new Map<number, number>()
  for (const q of payload.questions) {
    const { id: oldId, ...rest } = q
    const id = await db.questions.add({
      ...rest,
      subjectId: subjMap.get(q.subjectId) ?? q.subjectId,
    })
    if (oldId != null) qMap.set(oldId, Number(id))
  }

  const sessionMap = new Map<number, number>()
  for (const s of payload.sessions) {
    const { id: oldId, ...rest } = s
    let configJson = s.configJson
    if (configJson) {
      try {
        const cfg = JSON.parse(configJson) as { ids?: number[] } & Record<string, unknown>
        if (Array.isArray(cfg.ids)) cfg.ids = cfg.ids.map((id) => qMap.get(id) ?? id)
        configJson = JSON.stringify(cfg)
      } catch { /* leave as-is */ }
    }
    const id = await db.sessions.add({ ...rest, configJson })
    if (oldId != null) sessionMap.set(oldId, Number(id))
  }

  for (const a of payload.attempts) {
    const { id: _id, ...rest } = a
    await db.attempts.add({
      ...rest,
      questionId: qMap.get(a.questionId) ?? a.questionId,
      sessionId: a.sessionId != null ? (sessionMap.get(a.sessionId) ?? null) : null,
    })
  }

  for (const n of payload.notes) {
    await db.notes.put({ ...n, questionId: qMap.get(n.questionId) ?? n.questionId })
  }

  for (const s of payload.srs) {
    await db.srs.put({ ...s, questionId: qMap.get(s.questionId) ?? s.questionId })
  }
}

// --- change watcher with debounced auto-push ---
let dirty = false
let timer: ReturnType<typeof setTimeout> | null = null
const DEBOUNCE_MS = 5000

function markDirty() {
  if (useSync.getState().state === 'disabled') return
  dirty = true
  if (timer) clearTimeout(timer)
  timer = setTimeout(async () => {
    if (!dirty) return
    dirty = false
    await push()
  }, DEBOUNCE_MS)
}

let watching = false
export function watchChanges() {
  if (watching) return
  watching = true
  const tables = [db.questions, db.attempts, db.sessions, db.notes, db.srs, db.subjects, db.topics]
  for (const t of tables) {
    t.hook('creating', () => { markDirty() })
    t.hook('updating', () => { markDirty() })
    t.hook('deleting', () => { markDirty() })
  }
}

export async function bootstrap() {
  const s = await loadDriveSettings()
  if (!s.clientId) return
  try {
    await connect(s.clientId, { silent: true })
    await pull()
  } catch {
    // silent failure on boot — user can reconnect manually
    useSync.getState().setStatus({ state: 'error', message: 'Sessão expirou — reconecte.' })
  }
  watchChanges()
}
