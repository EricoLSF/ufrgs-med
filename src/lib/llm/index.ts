import { db } from '@/lib/db'
import { gemini } from './gemini'
import { DEFAULT_LLM_SETTINGS, type LLMProvider, type LLMSettings } from './types'

const SETTINGS_KEY = 'llm'

export async function loadLLMSettings(): Promise<LLMSettings> {
  const row = await db.settings.get(SETTINGS_KEY)
  if (!row) return { ...DEFAULT_LLM_SETTINGS }
  try { return { ...DEFAULT_LLM_SETTINGS, ...(JSON.parse(row.value) as LLMSettings) } }
  catch { return { ...DEFAULT_LLM_SETTINGS } }
}

export async function saveLLMSettings(s: LLMSettings): Promise<void> {
  await db.settings.put({ key: SETTINGS_KEY, value: JSON.stringify(s) })
}

export async function getProvider(): Promise<LLMProvider | null> {
  const s = await loadLLMSettings()
  if (!s.apiKey) return null
  if (s.provider === 'gemini') return gemini(s.apiKey, s.model)
  return null
}

export type { LLMProvider, LLMSettings, ChatMessage } from './types'
export { DEFAULT_LLM_SETTINGS } from './types'
