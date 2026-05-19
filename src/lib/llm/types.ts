export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface LLMProvider {
  name: string
  generate(messages: ChatMessage[]): Promise<string>
}

export interface LLMSettings {
  provider: 'gemini'
  apiKey: string | null
  model: string
}

export const DEFAULT_LLM_SETTINGS: LLMSettings = {
  provider: 'gemini',
  apiKey: null,
  model: 'gemini-2.5-flash',
}
