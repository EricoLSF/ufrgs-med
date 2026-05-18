import { usePerSubjectStats } from './hooks'

export function PerSubject() {
  const stats = usePerSubjectStats()
  const withData = stats.filter((s) => s.count > 0)

  if (withData.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        Sem dados ainda — resolva algumas questões pra ver o gráfico por matéria.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {stats.map((s) => {
        const pct = s.accuracy == null ? 0 : Math.round(s.accuracy * 100)
        const display = s.accuracy == null ? '—' : `${pct}%`
        return (
          <div key={s.subjectId} className="grid grid-cols-[140px_1fr_60px] items-center gap-3 text-sm">
            <div className="flex items-center gap-2 truncate">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="truncate">{s.name}</span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ width: `${pct}%`, background: s.color }}
              />
            </div>
            <div className="text-right tabular-nums text-muted-foreground">
              <span className="font-medium text-foreground">{display}</span>
              <span className="text-xs"> ({s.count})</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
