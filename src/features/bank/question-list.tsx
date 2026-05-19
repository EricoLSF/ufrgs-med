import { useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { AlertTriangle, Archive, Plus, Search, Star } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { db } from '@/lib/db'
import { useSubjects } from '@/lib/db/hooks'
import { cn } from '@/lib/utils'

const PAGE = 200

export function QuestionList() {
  const subjects = useSubjects()
  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id!, s])), [subjects])
  const navigate = useNavigate()

  const [subjectId, setSubjectId] = useState<number | ''>('')
  const [year, setYear] = useState('')
  const [search, setSearch] = useState('')
  const [tag, setTag] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [favOnly, setFavOnly] = useState(false)
  const [reviewOnly, setReviewOnly] = useState(false)

  const reviewCount = useLiveQuery(
    () => db.questions.where('needsReview').equals(1).count(),
    [],
    0,
  )

  const questions = useLiveQuery(async () => {
    let coll = db.questions.where('isArchived').equals(showArchived ? 1 : 0)
    if (favOnly) coll = coll.and((q) => q.isFavorite === 1)
    if (reviewOnly) coll = coll.and((q) => q.needsReview === 1)
    if (subjectId !== '') coll = coll.and((q) => q.subjectId === subjectId)
    if (year) coll = coll.and((q) => q.year === Number(year))
    if (tag) {
      const t = tag.toLowerCase()
      coll = coll.and((q) => q.tags.some((x) => x.includes(t)))
    }
    if (search) {
      const s = search.toLowerCase()
      coll = coll.and((q) => q.statementMd.toLowerCase().includes(s))
    }
    const arr = await coll.reverse().sortBy('createdAt')
    return arr.slice(0, PAGE)
  }, [subjectId, year, search, tag, showArchived, favOnly, reviewOnly], [])

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 md:p-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Questões</h1>
          <p className="text-sm text-muted-foreground">{questions.length} resultado(s)</p>
        </div>
        <Link to="/questions/new" className={buttonVariants()}>
          <Plus /> Nova
        </Link>
      </header>

      <div className="grid gap-2 md:grid-cols-[1fr_180px_140px_180px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar no enunciado…"
            className="pl-8"
          />
        </div>
        <Select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value === '' ? '' : Number(e.target.value))}
        >
          <option value="">Todas as matérias</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
        <Input
          type="number"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          placeholder="Ano"
        />
        <Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="#tag" />
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <Toggle on={reviewOnly} onClick={() => setReviewOnly((v) => !v)}>
          <AlertTriangle className="h-3 w-3" />
          Por revisar
          {reviewCount > 0 && (
            <span className={cn('ml-1 rounded-full px-1.5 text-[10px]', reviewOnly ? 'bg-background/30' : 'bg-warning/20 text-[var(--color-warning)]')}>
              {reviewCount}
            </span>
          )}
        </Toggle>
        <Toggle on={favOnly} onClick={() => setFavOnly((v) => !v)}>
          <Star className="h-3 w-3" /> Favoritas
        </Toggle>
        <Toggle on={showArchived} onClick={() => setShowArchived((v) => !v)}>
          <Archive className="h-3 w-3" /> Arquivadas
        </Toggle>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma questão ainda. Crie uma manualmente ou importe via JSON nas configurações.
          </p>
          <Link to="/questions/new" className={cn(buttonVariants({ variant: 'secondary' }), 'mt-4')}>
            <Plus /> Criar primeira questão
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {questions.map((q) => {
            const s = subjectMap.get(q.subjectId)
            const preview = q.statementMd.replace(/\s+/g, ' ').slice(0, 160)
            return (
              <li
                key={q.id}
                onClick={() => navigate({ to: '/questions/$id', params: { id: String(q.id) } })}
                className="group flex cursor-pointer items-center gap-4 overflow-hidden rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/40"
              >
                <div
                  className="h-10 w-1 shrink-0 rounded-full"
                  style={{ background: s?.color ?? 'var(--color-border)' }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {s && (
                      <span style={{ color: s.color }} className="font-medium">{s.name}</span>
                    )}
                    {q.year && <Badge variant="outline">{q.year}</Badge>}
                    {q.needsReview === 1 && (
                      <Badge variant="warning"><AlertTriangle className="mr-1 h-2.5 w-2.5" />revisar</Badge>
                    )}
                    {q.isFavorite === 1 && <Star className="h-3 w-3 fill-current text-amber-500" />}
                    {q.tags.slice(0, 4).map((t) => (
                      <Badge key={t} variant="secondary">#{t}</Badge>
                    ))}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{preview || '(sem enunciado)'}</p>
                </div>
                <div className="hidden shrink-0 text-xs text-muted-foreground md:block">
                  #{q.id}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      variant={on ? 'secondary' : 'outline'}
      size="sm"
      onClick={onClick}
      className={cn(!on && 'text-muted-foreground')}
    >
      {children}
    </Button>
  )
}
