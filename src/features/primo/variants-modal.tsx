import { useEffect, useState } from 'react'
import { CheckCircle2, Plus, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Markdown } from '@/lib/markdown'
import { getProvider } from '@/lib/llm'
import { parseVariants, variantsPrompt, VARIANTS_SYSTEM, type GeneratedVariant } from '@/lib/llm/prompts'
import { createQuestion } from '@/lib/db/queries'
import { cn } from '@/lib/utils'
import type { Question, Subject } from '@/lib/db/schema'

const LETTERS = ['A', 'B', 'C', 'D', 'E']

interface Props {
  question: Question
  subject: Subject
  userAnswer?: number | null
  onClose: () => void
}

export function VariantsModal({ question, subject, userAnswer, onClose }: Props) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'no-key'>('loading')
  const [variants, setVariants] = useState<GeneratedVariant[]>([])
  const [error, setError] = useState<string | null>(null)
  const [added, setAdded] = useState<Set<number>>(new Set())

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const provider = await getProvider()
        if (!provider) { if (!cancelled) setStatus('no-key'); return }
        const raw = await provider.generate([
          { role: 'system', content: VARIANTS_SYSTEM },
          { role: 'user', content: variantsPrompt({ question, subject, userAnswer }) },
        ])
        const parsed = parseVariants(raw)
        if (cancelled) return
        setVariants(parsed)
        setStatus('ready')
      } catch (e) {
        if (cancelled) return
        setError((e as Error).message)
        setStatus('error')
      }
    })()
    return () => { cancelled = true }
  }, [question.id, subject.id, userAnswer])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function addToBank(i: number) {
    const v = variants[i]
    await createQuestion({
      subjectId: subject.id!,
      topicId: question.topicId,
      year: null,
      source: 'Primo (variante)',
      difficulty: question.difficulty,
      statementMd: v.statement,
      alternatives: v.alternatives,
      correctAlt: v.correctAlt,
      explanationMd: v.explanation || null,
      tags: [...question.tags, 'primo-variant'],
      isFavorite: 0,
      isArchived: 0,
      needsReview: 0,
    })
    setAdded((prev) => new Set(prev).add(i))
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/90 backdrop-blur">
      <div className="flex items-center justify-between border-b border-border bg-background px-6 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--color-warning)]" />
          <div>
            <div className="text-sm font-semibold">Primo · 5 variantes</div>
            <div className="text-xs text-muted-foreground">
              Geradas a partir da questão #{question.id} ({subject.name})
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}><X /></Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl p-6 md:p-10">
          {status === 'loading' && <Loading />}
          {status === 'no-key' && <NoKey onClose={onClose} />}
          {status === 'error' && <ErrorState message={error ?? ''} />}
          {status === 'ready' && (
            <div className="space-y-6">
              {variants.map((v, i) => (
                <VariantCard
                  key={i}
                  index={i}
                  variant={v}
                  added={added.has(i)}
                  onAdd={() => addToBank(i)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Loading() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-sm text-muted-foreground">
      <Sparkles className="h-6 w-6 animate-pulse text-[var(--color-warning)]" />
      Primo está pensando…
    </div>
  )
}

function NoKey({ onClose }: { onClose: () => void }) {
  return (
    <div className="space-y-4 text-sm">
      <div className="text-base font-semibold">Primo precisa de uma API key</div>
      <p className="text-muted-foreground">
        Configure a chave Gemini em <strong>Configurações → Primo</strong> e tente de novo.
      </p>
      <Button onClick={onClose}>Fechar</Button>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
      Primo falhou: {message}
    </div>
  )
}

function VariantCard({
  index, variant: v, added, onAdd,
}: { index: number; variant: GeneratedVariant; added: boolean; onAdd: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <Badge variant="secondary">Variante #{index + 1}</Badge>
        {added ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-success)]">
            <CheckCircle2 className="h-3.5 w-3.5" /> Adicionada ao banco
          </span>
        ) : (
          <Button size="sm" variant="secondary" onClick={onAdd}>
            <Plus /> Adicionar ao banco
          </Button>
        )}
      </div>

      <Markdown>{v.statement}</Markdown>

      <ol className="mt-4 space-y-1.5">
        {v.alternatives.map((alt, i) => (
          <li
            key={i}
            className={cn(
              'flex items-start gap-3 rounded-md border border-border p-2.5 text-sm',
              i === v.correctAlt && 'border-[color-mix(in_oklch,var(--color-success)_50%,transparent)] bg-[color-mix(in_oklch,var(--color-success)_8%,transparent)]',
            )}
          >
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded text-[10px] font-semibold">
              {LETTERS[i]}
            </span>
            <Markdown>{alt}</Markdown>
          </li>
        ))}
      </ol>

      {v.explanation && (
        <div className="mt-3 rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Comentário:</span> {v.explanation}
        </div>
      )}
      {v.trap && (
        <div className="mt-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Armadilha:</span> {v.trap}
        </div>
      )}
    </div>
  )
}
