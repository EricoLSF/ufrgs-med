import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { BookOpen, Clock, Play, Repeat, Zap } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { db } from '@/lib/db'
import { useSubjects } from '@/lib/db/hooks'
import { createSession } from '@/lib/db/queries'
import { cn } from '@/lib/utils'
import { shuffle } from '@/lib/shortcuts'
import type { SessionType } from '@/lib/db/schema'

interface ModeOption {
  type: SessionType
  title: string
  description: string
  icon: typeof Play
}

const modes: ModeOption[] = [
  { type: 'drill', title: 'Drill', description: 'Por matéria ou tag, no seu ritmo.', icon: BookOpen },
  { type: 'simulado', title: 'Simulado', description: 'Prova completa, com timer.', icon: Clock },
  { type: 'quick', title: 'Rápido', description: '10 questões aleatórias.', icon: Zap },
  { type: 'srs', title: 'Revisão (SRS)', description: 'Repetição espaçada — fila de hoje.', icon: Repeat },
]

export function StudySetup() {
  const subjects = useSubjects()
  const navigate = useNavigate()
  const [type, setType] = useState<SessionType>('drill')

  const [subjectId, setSubjectId] = useState<number | ''>('')
  const [tag, setTag] = useState('')
  const [year, setYear] = useState('')
  const [limit, setLimit] = useState(20)

  const dueCount = useLiveQuery(
    async () => db.srs.where('dueAt').belowOrEqual(new Date().toISOString()).count(),
    [],
    0,
  )

  const yearOptions = useLiveQuery(async () => {
    const set = new Set<number>()
    await db.questions.where('isArchived').equals(0).each((q) => {
      if (q.year != null) set.add(q.year)
    })
    return [...set].sort((a, b) => b - a)
  }, [], [])

  const config = useMemo(
    () => ({
      type, subjectId: subjectId === '' ? null : subjectId, tag: tag || null,
      year: year ? Number(year) : null, limit,
    }),
    [type, subjectId, tag, year, limit],
  )

  async function start() {
    const questions = await db.questions.where('isArchived').equals(0).toArray()

    let pool = questions
    if (type === 'simulado') {
      if (!year) return
      pool = pool.filter((q) => q.year === Number(year))
    } else if (type === 'drill') {
      if (subjectId !== '') pool = pool.filter((q) => q.subjectId === subjectId)
      if (tag) pool = pool.filter((q) => q.tags.some((t) => t.includes(tag.toLowerCase())))
    } else if (type === 'srs') {
      const due = await db.srs.where('dueAt').belowOrEqual(new Date().toISOString()).toArray()
      const ids = new Set(due.map((s) => s.questionId))
      pool = pool.filter((q) => ids.has(q.id!))
    }

    let ids = pool.map((q) => q.id!)
    if (type !== 'simulado') ids = shuffle(ids)
    if (type === 'quick') ids = ids.slice(0, 10)
    else if (type === 'drill') ids = ids.slice(0, limit)

    if (!ids.length) {
      alert('Nenhuma questão encontrada com esses filtros.')
      return
    }

    const sessionId = await createSession(type, { ...config, ids })
    navigate({ to: '/study/session/$id', params: { id: String(sessionId) } })
  }

  const ready =
    (type === 'quick') ||
    (type === 'drill') ||
    (type === 'simulado' && !!year) ||
    (type === 'srs' && dueCount > 0)

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6 md:p-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Estudar</h1>
        <p className="text-sm text-muted-foreground">Escolha o modo e os filtros.</p>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        {modes.map((m) => {
          const Icon = m.icon
          const selected = type === m.type
          return (
            <button
              key={m.type}
              type="button"
              onClick={() => setType(m.type)}
              className={cn(
                'flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors',
                selected ? 'border-primary ring-2 ring-primary/30' : 'hover:bg-accent/40',
              )}
            >
              <div className="grid h-8 w-8 place-items-center rounded-md bg-secondary">
                <Icon className="h-4 w-4" />
              </div>
              <div className="text-sm font-semibold">{m.title}</div>
              <div className="text-xs text-muted-foreground">{m.description}</div>
              {m.type === 'srs' && (
                <div className="mt-1 text-[11px] font-medium text-muted-foreground">
                  {dueCount} pendentes hoje
                </div>
              )}
            </button>
          )
        })}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Configurações do modo selecionado.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {type === 'drill' && (
            <>
              <Field label="Matéria">
                <Select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value === '' ? '' : Number(e.target.value))}
                >
                  <option value="">Todas</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Tag">
                <Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="ex: mendel" />
              </Field>
              <Field label="Quantidade">
                <Input
                  type="number"
                  value={limit}
                  min={1}
                  max={200}
                  onChange={(e) => setLimit(Number(e.target.value) || 1)}
                />
              </Field>
            </>
          )}
          {type === 'simulado' && (
            <Field label="Ano">
              <Select value={year} onChange={(e) => setYear(e.target.value)}>
                <option value="">Selecione…</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Select>
            </Field>
          )}
          {type === 'quick' && (
            <p className="text-sm text-muted-foreground md:col-span-3">
              10 questões aleatórias do banco inteiro. Sem filtros.
            </p>
          )}
          {type === 'srs' && (
            <p className="text-sm text-muted-foreground md:col-span-3">
              {dueCount > 0
                ? `${dueCount} questão(ões) prontas pra revisar hoje.`
                : 'Sem revisões pendentes — responda algumas questões com confiança baixa pra alimentar a fila.'}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="lg" onClick={start} disabled={!ready}>
          <Play /> Iniciar sessão
        </Button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
