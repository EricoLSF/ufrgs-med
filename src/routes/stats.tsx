import { createFileRoute } from '@tanstack/react-router'
import { Flame, Library, Repeat, Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ActivityHeatmap } from '@/features/stats/activity-heatmap'
import { PerSubject } from '@/features/stats/per-subject'
import { ConfidenceCalibration } from '@/features/stats/confidence-calibration'
import { useDueCount, useOverallStats, useStreak } from '@/features/stats/hooks'
import { useQuestionCount } from '@/lib/db/hooks'

export const Route = createFileRoute('/stats')({ component: Stats })

function Stats() {
  const overall = useOverallStats()
  const streak = useStreak()
  const due = useDueCount()
  const total = useQuestionCount()

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Estatísticas</h1>
        <p className="text-sm text-muted-foreground">Como está sua evolução.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <Kpi icon={<Target className="h-4 w-4" />} label="Acerto geral" value={overall.count ? `${Math.round(overall.accuracy * 100)}%` : '—'} sub={`${overall.count} tentativas`} />
        <Kpi icon={<Flame className="h-4 w-4" />} label="Streak" value={`${streak} dia(s)`} />
        <Kpi icon={<Repeat className="h-4 w-4" />} label="Revisões pendentes" value={String(due)} />
        <Kpi icon={<Library className="h-4 w-4" />} label="Questões no banco" value={String(total)} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Acerto por matéria</CardTitle>
        </CardHeader>
        <CardContent>
          <PerSubject />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <ActivityHeatmap />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Calibração de confiança</CardTitle>
        </CardHeader>
        <CardContent>
          <ConfidenceCalibration />
        </CardContent>
      </Card>
    </div>
  )
}

function Kpi({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="grid h-9 w-9 place-items-center rounded-md bg-secondary text-secondary-foreground">
          {icon}
        </div>
        <div className="leading-tight">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-lg font-semibold">{value}</div>
          {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  )
}
