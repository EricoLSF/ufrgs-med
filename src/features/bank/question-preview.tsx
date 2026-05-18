import { Check } from 'lucide-react'
import { Markdown } from '@/lib/markdown'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { QuestionDraft } from './types'
import type { Subject } from '@/lib/db/schema'

const letters = ['A', 'B', 'C', 'D', 'E']

export function QuestionPreview({
  q,
  subject,
  showAnswer = true,
}: {
  q: QuestionDraft
  subject?: Subject
  showAnswer?: boolean
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {subject && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5"
            style={{ color: subject.color, borderColor: `color-mix(in oklch, ${subject.color} 45%, transparent)` }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: subject.color }} />
            {subject.name}
          </span>
        )}
        {q.year && <Badge variant="outline">{q.year}</Badge>}
        {q.source && q.source !== 'user' && <Badge variant="outline">{q.source}</Badge>}
        {q.difficulty != null && <Badge variant="secondary">dif. {q.difficulty}</Badge>}
        {q.tags.map((t) => (
          <Badge key={t} variant="secondary">#{t}</Badge>
        ))}
      </div>

      <Markdown>{q.statementMd || '_(enunciado vazio)_'}</Markdown>

      <ol className="space-y-2">
        {q.alternatives.map((alt, i) => {
          const isCorrect = i === q.correctAlt && showAnswer
          return (
            <li
              key={i}
              className={cn(
                'flex items-start gap-3 rounded-lg border border-border p-3 text-sm',
                isCorrect && 'border-[color-mix(in_oklch,var(--color-success)_60%,transparent)] bg-[color-mix(in_oklch,var(--color-success)_8%,transparent)]',
              )}
            >
              <div
                className={cn(
                  'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border border-border text-xs font-semibold',
                  isCorrect && 'border-transparent bg-[var(--color-success)] text-white',
                )}
              >
                {isCorrect ? <Check className="h-3.5 w-3.5" /> : letters[i]}
              </div>
              <div className="flex-1">
                <Markdown>{alt || `_(alternativa ${letters[i]} vazia)_`}</Markdown>
              </div>
            </li>
          )
        })}
      </ol>

      {showAnswer && q.explanationMd && (
        <div className="rounded-lg border border-dashed border-border bg-muted/40 p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Comentário
          </div>
          <Markdown>{q.explanationMd}</Markdown>
        </div>
      )}
    </div>
  )
}
