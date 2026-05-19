import type { Question, Subject } from '@/lib/db/schema'

const LETTERS = ['A', 'B', 'C', 'D', 'E']

export interface GeneratedVariant {
  statement: string
  alternatives: string[]   // length 5
  correctAlt: number       // 0..4
  explanation: string
  trap: string
}

export interface VariantsRequest {
  question: Question
  subject: Subject
  userAnswer?: number | null
}

export const VARIANTS_SYSTEM =
  'Você é um assistente especializado em gerar questões no estilo do vestibular UFRGS. Produz português culto, ' +
  'matemática/química rigorosa, e responde APENAS em JSON válido quando solicitado — sem markdown, sem texto extra.'

export function variantsPrompt(req: VariantsRequest): string {
  const { question: q, subject, userAnswer } = req
  return `Esta é uma questão do vestibular UFRGS de ${subject.name}:

[ENUNCIADO]
${q.statementMd}

[ALTERNATIVAS]
${q.alternatives.map((a, i) => `${LETTERS[i]}) ${a}`).join('\n')}

Gabarito: ${LETTERS[q.correctAlt]}.${userAnswer != null ? ` Eu marquei: ${LETTERS[userAnswer]}.` : ''}

Faça duas coisas:

1. Diagnostique mentalmente o gap conceitual sob o erro (ou sob a dificuldade central da questão).
2. Gere 5 questões NOVAS no estilo UFRGS, dificuldade crescente, atacando esse mesmo gap conceitual.

Para cada questão, retorne:
- "statement": enunciado em Markdown. Use $...$ pra LaTeX inline e $$...$$ pra bloco. Não use imagens.
- "alternatives": array de exatamente 5 strings (alternativas A-E em ordem)
- "correctAlt": índice 0..4 da alternativa correta
- "explanation": 1-2 frases explicando por que a correta é correta
- "trap": 1 frase descrevendo a armadilha principal que o aluno cai

Retorne EXCLUSIVAMENTE um JSON array de 5 objetos. Sem markdown, sem \`\`\`, sem texto antes ou depois.

Exemplo de formato:
[
  {"statement": "...", "alternatives": ["...", "...", "...", "...", "..."], "correctAlt": 0, "explanation": "...", "trap": "..."},
  ...
]`
}

export function parseVariants(raw: string): GeneratedVariant[] {
  // Strip surrounding ```json fences if the model added them despite instructions.
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch (e) {
    throw new Error(`Resposta não é JSON válido: ${(e as Error).message}`)
  }
  if (!Array.isArray(parsed)) throw new Error('Esperava um array')
  return parsed.map((v, i) => {
    if (
      typeof v !== 'object' || v == null ||
      typeof (v as { statement?: unknown }).statement !== 'string' ||
      !Array.isArray((v as { alternatives?: unknown }).alternatives) ||
      (v as { alternatives: unknown[] }).alternatives.length !== 5 ||
      typeof (v as { correctAlt?: unknown }).correctAlt !== 'number'
    ) {
      throw new Error(`Variante #${i + 1} mal formatada`)
    }
    const x = v as GeneratedVariant
    return {
      statement: x.statement,
      alternatives: x.alternatives.map(String),
      correctAlt: Math.max(0, Math.min(4, Math.round(x.correctAlt))),
      explanation: typeof x.explanation === 'string' ? x.explanation : '',
      trap: typeof x.trap === 'string' ? x.trap : '',
    }
  })
}
