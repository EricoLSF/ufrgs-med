import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { BookOpen, Flame, Library, Repeat, Sparkles, Target, TrendingDown, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useQuestionCount } from '@/lib/db/hooks'
import { importQuestions } from '@/lib/io'
import {
  useDueCount,
  useOverallStats,
  usePerSubjectStats,
  useStreak,
} from '@/features/stats/hooks'

export const Route = createFileRoute('/')({ component: Dashboard })

function Dashboard() {
  const subjects = usePerSubjectStats()
  const overall = useOverallStats()
  const streak = useStreak()
  const due = useDueCount()
  const total = useQuestionCount()
  const [loading, setLoading] = useState(false)

  const weak = subjects
    .filter((s) => s.count >= 3 && s.accuracy != null)
    .sort((a, b) => (a.accuracy ?? 1) - (b.accuracy ?? 1))
    .slice(0, 3)

  async function loadStarter() {
    setLoading(true)
    try {
      const files = [
        'cv2024-dia1.json', 'cv2024-dia2.json',
        'cv2023-dia1.json', 'cv2023-dia2.json',
        'cv2022-dia1.json', 'cv2022-dia2.json',
      ]
      for (const f of files) {
        const payload = await (await fetch(import.meta.env.BASE_URL + f)).json()
        await importQuestions(payload)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Bom estudo.</h1>
        <p className="text-sm text-muted-foreground">
          Foco em Medicina — UFRGS.{' '}
          {due > 0
            ? `${due} questão(ões) prontas pra revisar.`
            : 'Sem revisões pendentes — pode fazer um drill.'}
        </p>
      </header>

      {total === 0 && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex flex-col items-start gap-3 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-base font-semibold">
                <Sparkles className="h-4 w-4" /> Comece com UFRGS 2022–2024
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Importa ~400 questões reais (3 anos × 2 dias) direto pro seu banco. Tudo fica salvo neste navegador.
              </p>
            </div>
            <Button onClick={loadStarter} disabled={loading}>
              <Sparkles /> {loading ? 'Importando…' : 'Carregar pacote'}
            </Button>
          </CardContent>
        </Card>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        <Stat icon={<Flame className="h-4 w-4" />} label="Streak" value={`${streak} dia(s)`} />
        <Stat
          icon={<Target className="h-4 w-4" />}
          label="Acerto geral"
          value={overall.count ? `${Math.round(overall.accuracy * 100)}%` : '—'}
        />
        <Stat
          icon={<BookOpen className="h-4 w-4" />}
          label="Questões no banco"
          value={String(total)}
        />
        <Stat
          icon={<TrendingUp className="h-4 w-4" />}
          label="Tentativas"
          value={String(overall.count)}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Revisão de hoje
              <Badge variant={due > 0 ? 'default' : 'outline'}>SRS</Badge>
            </CardTitle>
            <CardDescription>Fila por repetição espaçada (FSRS).</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {due > 0 ? `${due} pendente(s).` : 'Nada pendente agora.'}
            </p>
            <Link
              to="/study"
              className={cn(buttonVariants({ variant: due > 0 ? 'default' : 'secondary' }))}
            >
              <Repeat /> {due > 0 ? 'Revisar' : 'Configurar'}
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sessão rápida</CardTitle>
            <CardDescription>10 questões aleatórias do banco.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">~10 min.</p>
            <Link to="/study" className={buttonVariants()}>
              Começar
            </Link>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Library className="h-4 w-4" /> Pontos fracos
            </CardTitle>
            <CardDescription>Assuntos com menor acerto (mín. 3 tentativas).</CardDescription>
          </CardHeader>
          <CardContent>
            {weak.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sem dados suficientes — resolva mais questões e seus pontos fracos vão aparecer aqui.
              </p>
            ) : (
              <div className="space-y-2">
                {weak.map((s) => (
                  <div
                    key={s.subjectId}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                      <span className="text-sm font-medium">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground">{s.count} tentativas</span>
                      <span className="flex items-center gap-1 font-semibold text-destructive">
                        <TrendingDown className="h-3.5 w-3.5" />
                        {Math.round((s.accuracy ?? 0) * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Matérias</CardTitle>
            <CardDescription>Disciplinas do vestibular UFRGS.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {subjects.map((s) => (
                <span
                  key={s.subjectId}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm"
                  style={{ color: s.color, borderColor: `color-mix(in oklch, ${s.color} 50%, transparent)` }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {s.name}
                  {s.count > 0 && (
                    <span className="text-xs opacity-70">· {s.count}</span>
                  )}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="grid h-9 w-9 place-items-center rounded-md bg-secondary text-secondary-foreground">
          {icon}
        </div>
        <div className="leading-tight">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-lg font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  )
}
