import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { db } from '@/lib/db'
import { createQuestion, updateQuestion } from '@/lib/db/queries'
import { useSubjects } from '@/lib/db/hooks'
import { cn } from '@/lib/utils'
import { newDraft, type QuestionDraft } from './types'
import { QuestionPreview } from './question-preview'

const letters = ['A', 'B', 'C', 'D', 'E']

export function QuestionEditor({ id, initial }: { id?: number; initial?: QuestionDraft }) {
  const subjects = useSubjects()
  const navigate = useNavigate()
  const [form, setForm] = useState<QuestionDraft | null>(initial ?? null)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [tagsRaw, setTagsRaw] = useState(initial?.tags.join(', ') ?? '')

  // Initialize draft once subjects load (for "new" case)
  useEffect(() => {
    if (form || !subjects.length || initial) return
    setForm(newDraft(subjects[0].id!))
  }, [subjects, form, initial])

  // Re-sync when initial changes (route change)
  useEffect(() => {
    if (initial) {
      setForm(initial)
      setTagsRaw(initial.tags.join(', '))
    }
  }, [initial])

  if (!form) {
    return <div className="p-10 text-sm text-muted-foreground">Carregando…</div>
  }

  const subject = subjects.find((s) => s.id === form.subjectId)
  const canSave = form.statementMd.trim().length > 0 && form.alternatives.filter((a) => a.trim()).length >= 2

  function patch(p: Partial<QuestionDraft>) {
    setForm((f) => (f ? { ...f, ...p } : f))
  }
  function setAlt(i: number, v: string) {
    setForm((f) => {
      if (!f) return f
      const alts = [...f.alternatives]
      alts[i] = v
      return { ...f, alternatives: alts }
    })
  }

  async function save() {
    if (!form || !canSave) return
    const tags = tagsRaw
      .split(',')
      .map((t) => t.trim().toLowerCase().replace(/\s+/g, '-'))
      .filter(Boolean)
    const payload = { ...form, tags }
    if (id != null) {
      await updateQuestion(id, payload)
    } else {
      const newId = await createQuestion(payload)
      navigate({ to: '/questions/$id', params: { id: String(newId) }, replace: true })
    }
    setSavedAt(Date.now())
  }

  async function remove() {
    if (id == null) return
    if (!confirm('Excluir esta questão? Esta ação não pode ser desfeita.')) return
    await db.questions.delete(id)
    navigate({ to: '/questions' })
  }

  // keyboard shortcut: Ctrl+S / Cmd+S to save
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, tagsRaw, id])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border bg-background px-6 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/questions' })}>
            <ArrowLeft />
          </Button>
          <div className="leading-tight">
            <div className="text-sm font-semibold">{id == null ? 'Nova questão' : `Questão #${id}`}</div>
            <div className="text-xs text-muted-foreground">
              {savedAt && Date.now() - savedAt < 3000 ? 'Salvo' : 'Ctrl+S para salvar'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {id != null && (
            <Button variant="ghost" size="sm" onClick={remove}>
              <Trash2 /> Excluir
            </Button>
          )}
          <Button size="sm" onClick={save} disabled={!canSave}>
            <Save /> Salvar
          </Button>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-2">
        {/* form */}
        <div className="space-y-5 overflow-y-auto border-r border-border p-6">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Matéria">
              <Select
                value={form.subjectId}
                onChange={(e) => patch({ subjectId: Number(e.target.value) })}
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Ano">
              <Input
                type="number"
                value={form.year ?? ''}
                placeholder="Ex: 2024"
                onChange={(e) => patch({ year: e.target.value ? Number(e.target.value) : null })}
              />
            </Field>
            <Field label="Dificuldade (1-5)">
              <Select
                value={form.difficulty ?? ''}
                onChange={(e) => patch({ difficulty: e.target.value ? Number(e.target.value) : null })}
              >
                <option value="">—</option>
                {[1, 2, 3, 4, 5].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </Select>
            </Field>
            <Field label="Fonte">
              <Input
                value={form.source ?? ''}
                placeholder="UFRGS, ENEM, autor…"
                onChange={(e) => patch({ source: e.target.value || null })}
              />
            </Field>
          </div>

          <Field label="Enunciado (Markdown + LaTeX com $…$ e $$…$$)">
            <Textarea
              className="min-h-[180px] font-mono text-xs leading-relaxed"
              value={form.statementMd}
              onChange={(e) => patch({ statementMd: e.target.value })}
              placeholder={'Considere a função $f(x) = x^2 + 2x$.\n\nQual o valor de $f(3)$?'}
            />
          </Field>

          <div className="space-y-2">
            <Label>Alternativas — marque a correta</Label>
            <div className="space-y-2">
              {form.alternatives.map((alt, i) => (
                <div key={i} className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => patch({ correctAlt: i })}
                    className={cn(
                      'mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border text-xs font-semibold transition-colors',
                      form.correctAlt === i
                        ? 'border-transparent bg-[var(--color-success)] text-white'
                        : 'hover:bg-accent',
                    )}
                    title="Marcar como correta"
                  >
                    {letters[i]}
                  </button>
                  <Textarea
                    className="min-h-[44px] font-mono text-xs"
                    value={alt}
                    onChange={(e) => setAlt(i, e.target.value)}
                    placeholder={`Alternativa ${letters[i]}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <Field label="Tags (vírgula)">
            <Input
              value={tagsRaw}
              placeholder="genetica, mendel, biologia-molecular"
              onChange={(e) => setTagsRaw(e.target.value)}
            />
          </Field>

          <Field label="Comentário / Resolução">
            <Textarea
              className="min-h-[100px] font-mono text-xs leading-relaxed"
              value={form.explanationMd ?? ''}
              onChange={(e) => patch({ explanationMd: e.target.value || null })}
              placeholder="Explicação opcional, vista após responder."
            />
          </Field>
        </div>

        {/* preview */}
        <div className="overflow-y-auto bg-muted/30 p-6">
          <div className="mx-auto max-w-2xl">
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Preview
            </div>
            <div className="rounded-xl border border-border bg-background p-6">
              <QuestionPreview q={{ ...form, tags: tagsRaw.split(',').map((t) => t.trim().toLowerCase().replace(/\s+/g, '-')).filter(Boolean) }} subject={subject} />
            </div>
          </div>
        </div>
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
