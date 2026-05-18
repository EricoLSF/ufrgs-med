import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, ChevronRight, Flag, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Markdown } from '@/lib/markdown'
import { Badge } from '@/components/ui/badge'
import { useShortcuts } from '@/lib/shortcuts'
import { db } from '@/lib/db'
import { endSession, recordAttempt } from '@/lib/db/queries'
import { gradeFromAttempt, reviewQuestion } from '@/lib/srs'
import { cn } from '@/lib/utils'
import type { Confidence, Session } from '@/lib/db/schema'

const letters = ['A', 'B', 'C', 'D', 'E']

interface SessionConfig {
  ids: number[]
  type: Session['type']
}

export function StudySession({ session }: { session: Session }) {
  const navigate = useNavigate()
  const config = useMemo(() => JSON.parse(session.configJson ?? '{}') as SessionConfig, [session.configJson])
  const ids = config.ids ?? []

  const [idx, setIdx] = useState(0)
  const [selectedAlt, setSelectedAlt] = useState<number | null>(null)
  const [phase, setPhase] = useState<'pre' | 'post'>('pre')
  const [startTime, setStartTime] = useState(() => Date.now())
  const [results, setResults] = useState<{ correct: boolean; timeMs: number; confidence: Confidence | null }[]>([])

  const done = idx >= ids.length
  const currentId = !done ? ids[idx] : null
  const q = useLiveQuery(() => (currentId == null ? undefined : db.questions.get(currentId)), [currentId])
  const subject = useLiveQuery(
    () => (q ? db.subjects.get(q.subjectId) : undefined),
    [q?.subjectId],
  )

  // Lock body scroll-flash on phase change
  useEffect(() => {
    setStartTime(Date.now())
  }, [idx])

  async function pickAlt(i: number) {
    if (phase !== 'pre' || !q) return
    setSelectedAlt(i)
    setPhase('post')
  }

  async function commitConfidence(c: Confidence | null) {
    if (phase !== 'post' || !q) return
    const correct = selectedAlt === q.correctAlt
    const timeMs = Date.now() - startTime
    await recordAttempt({
      sessionId: session.id!,
      questionId: q.id!,
      selectedAlt,
      isCorrect: correct ? 1 : 0,
      confidence: c,
      timeMs,
    })
    await reviewQuestion(q.id!, gradeFromAttempt(correct, c))
    setResults((r) => [...r, { correct, timeMs, confidence: c }])
    advance()
  }

  async function skip() {
    if (!q) return
    const timeMs = Date.now() - startTime
    await recordAttempt({
      sessionId: session.id!,
      questionId: q.id!,
      selectedAlt: null,
      isCorrect: 0,
      confidence: null,
      timeMs,
    })
    await reviewQuestion(q.id!, gradeFromAttempt(false, null))
    setResults((r) => [...r, { correct: false, timeMs, confidence: null }])
    advance()
  }

  function advance() {
    setSelectedAlt(null)
    setPhase('pre')
    setIdx((i) => {
      const next = i + 1
      if (next >= ids.length) endSession(session.id!)
      return next
    })
  }

  useShortcuts(
    {
      '1': () => (phase === 'pre' ? pickAlt(0) : commitConfidence(1)),
      '2': () => (phase === 'pre' ? pickAlt(1) : commitConfidence(2)),
      '3': () => (phase === 'pre' ? pickAlt(2) : commitConfidence(3)),
      '4': () => phase === 'pre' && pickAlt(3),
      '5': () => phase === 'pre' && pickAlt(4),
      'enter': () => phase === 'post' && commitConfidence(null),
      'n': () => phase === 'pre' && skip(),
      'escape': () => navigate({ to: '/study' }),
    },
    !done,
  )

  if (done) return <SessionSummary results={results} ids={ids} onClose={() => navigate({ to: '/' })} />
  if (!q) return <div className="p-10 text-sm text-muted-foreground">Carregando…</div>

  const isCorrect = selectedAlt === q.correctAlt
  const progress = ((idx + (phase === 'post' ? 0.5 : 0)) / ids.length) * 100

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-background px-6 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/study' })}>
            Sair
          </Button>
          <div className="flex-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="text-xs tabular-nums text-muted-foreground">
            {idx + 1} / {ids.length}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-6 p-6 md:p-10">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {subject && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5"
                style={{ color: subject.color, borderColor: `color-mix(in oklch, ${subject.color} 45%, transparent)` }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: subject.color }} />
                {subject.name}
              </span>
            )}
            {q.year && <Badge variant="outline">{q.year}</Badge>}
            {q.difficulty != null && <Badge variant="secondary">dif. {q.difficulty}</Badge>}
          </div>

          <div className="rounded-xl border border-border bg-card p-6 text-base">
            <Markdown>{q.statementMd}</Markdown>
          </div>

          <ol className="space-y-2">
            {q.alternatives.map((alt, i) => {
              const picked = selectedAlt === i
              const isAnswered = phase === 'post'
              const isCorrectAlt = i === q.correctAlt
              const state =
                !isAnswered
                  ? picked
                    ? 'picked'
                    : 'idle'
                  : isCorrectAlt
                    ? 'correct'
                    : picked
                      ? 'wrong'
                      : 'idle'
              return (
                <li key={i}>
                  <button
                    type="button"
                    disabled={isAnswered}
                    onClick={() => pickAlt(i)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-lg border border-border p-3 text-left text-sm transition-colors',
                      state === 'idle' && 'hover:bg-accent/40',
                      state === 'picked' && 'border-primary ring-2 ring-primary/30',
                      state === 'correct' &&
                        'border-[color-mix(in_oklch,var(--color-success)_60%,transparent)] bg-[color-mix(in_oklch,var(--color-success)_10%,transparent)]',
                      state === 'wrong' &&
                        'border-[color-mix(in_oklch,var(--color-destructive)_60%,transparent)] bg-[color-mix(in_oklch,var(--color-destructive)_10%,transparent)]',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border text-xs font-semibold',
                        state === 'picked' && 'border-primary text-primary',
                        state === 'correct' && 'border-transparent bg-[var(--color-success)] text-white',
                        state === 'wrong' && 'border-transparent bg-destructive text-destructive-foreground',
                      )}
                    >
                      {state === 'correct' ? <Check className="h-3.5 w-3.5" /> : state === 'wrong' ? <X className="h-3.5 w-3.5" /> : letters[i]}
                    </span>
                    <span className="flex-1">
                      <Markdown>{alt}</Markdown>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>

          {phase === 'post' && (
            <div className="space-y-3">
              <div
                className={cn(
                  'rounded-lg border px-4 py-3 text-sm font-medium',
                  isCorrect
                    ? 'border-[color-mix(in_oklch,var(--color-success)_50%,transparent)] bg-[color-mix(in_oklch,var(--color-success)_8%,transparent)] text-[var(--color-success)]'
                    : 'border-[color-mix(in_oklch,var(--color-destructive)_50%,transparent)] bg-[color-mix(in_oklch,var(--color-destructive)_8%,transparent)] text-destructive',
                )}
              >
                {isCorrect ? 'Você acertou.' : `Resposta correta: ${letters[q.correctAlt]}.`}
              </div>
              {q.explanationMd && (
                <div className="rounded-lg border border-dashed border-border bg-muted/40 p-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Comentário
                  </div>
                  <Markdown>{q.explanationMd}</Markdown>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border bg-background px-6 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          {phase === 'pre' ? (
            <>
              <div className="text-xs text-muted-foreground">
                Atalhos: <Kbd>1</Kbd>–<Kbd>5</Kbd> alternativas · <Kbd>N</Kbd> pular · <Kbd>Esc</Kbd> sair
              </div>
              <Button variant="ghost" size="sm" onClick={skip}>
                <Flag /> Pular
              </Button>
            </>
          ) : (
            <>
              <div className="text-xs text-muted-foreground">Quão confiante você estava?</div>
              <div className="flex items-center gap-2">
                <ConfBtn k="1" label="Baixa" onClick={() => commitConfidence(1)} />
                <ConfBtn k="2" label="Média" onClick={() => commitConfidence(2)} />
                <ConfBtn k="3" label="Alta" onClick={() => commitConfidence(3)} />
                <Button size="sm" onClick={() => commitConfidence(null)}>
                  Próxima <ChevronRight />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">
      {children}
    </kbd>
  )
}

function ConfBtn({ k, label, onClick }: { k: string; label: string; onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      <Kbd>{k}</Kbd> {label}
    </Button>
  )
}

function SessionSummary({
  results,
  ids,
  onClose,
}: {
  results: { correct: boolean; timeMs: number; confidence: Confidence | null }[]
  ids: number[]
  onClose: () => void
}) {
  const total = ids.length
  const answered = results.length
  const correct = results.filter((r) => r.correct).length
  const accuracy = answered ? Math.round((correct / answered) * 100) : 0
  const avgTime = answered ? Math.round(results.reduce((s, r) => s + r.timeMs, 0) / answered / 1000) : 0

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-6 p-10 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Sessão concluída</h1>
      <div className="grid w-full grid-cols-3 gap-4 text-center">
        <Stat label="Acerto" value={`${accuracy}%`} />
        <Stat label="Respondidas" value={`${answered}/${total}`} />
        <Stat label="Tempo médio" value={`${avgTime}s`} />
      </div>
      <Button onClick={onClose}>Voltar ao início</Button>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  )
}
