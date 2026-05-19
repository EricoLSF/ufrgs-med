import type { ChatMessage, LLMProvider } from './types'

const API = 'https://generativelanguage.googleapis.com/v1beta/models'

export function gemini(apiKey: string, model = 'gemini-2.5-flash'): LLMProvider {
  return {
    name: `gemini/${model}`,
    async generate(messages: ChatMessage[]): Promise<string> {
      const system = messages.find((m) => m.role === 'system')?.content
      const conv = messages.filter((m) => m.role !== 'system')
      const contents = conv.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))

      const body = {
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      }

      const res = await fetch(`${API}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.text().catch(() => '')
        throw new Error(`Gemini ${res.status}: ${err.slice(0, 300)}`)
      }

      type GeminiResponse = {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> }
          finishReason?: string
        }>
        promptFeedback?: { blockReason?: string }
      }
      const data: GeminiResponse = await res.json()
      if (data.promptFeedback?.blockReason) {
        throw new Error(`Bloqueado pelo Gemini: ${data.promptFeedback.blockReason}`)
      }
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
      if (!text.trim()) throw new Error('Resposta vazia do Gemini')
      return text
    },
  }
}
