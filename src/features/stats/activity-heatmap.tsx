import { useMemo } from 'react'
import { useActivity } from './hooks'
import { cn } from '@/lib/utils'

const WEEKS = 12

export function ActivityHeatmap() {
  const data = useActivity(WEEKS * 7)

  const cells = useMemo(() => {
    const max = Math.max(1, ...data.map((d) => d.count))
    return data.map((d) => {
      const intensity = d.count === 0 ? 0 : Math.min(1, d.count / max)
      return { ...d, intensity }
    })
  }, [data])

  // Group into weeks (cols of 7)
  const cols: typeof cells[] = []
  for (let i = 0; i < cells.length; i += 7) cols.push(cells.slice(i, i + 7))

  const total = data.reduce((s, d) => s + d.count, 0)
  const activeDays = data.filter((d) => d.count > 0).length

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-sm font-semibold">Atividade</div>
          <div className="text-xs text-muted-foreground">
            {total} tentativas em {activeDays} dia(s) — últimos {WEEKS} semanas
          </div>
        </div>
        <Legend />
      </div>
      <div className="flex gap-1 overflow-x-auto">
        {cols.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-1">
            {col.map((cell, ri) => (
              <div
                key={ri}
                title={`${cell.date}: ${cell.count}`}
                className={cn('h-3 w-3 rounded-sm border border-border/30')}
                style={{
                  background:
                    cell.count === 0
                      ? 'var(--color-secondary)'
                      : `color-mix(in oklch, var(--color-primary) ${20 + cell.intensity * 80}%, transparent)`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function Legend() {
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
      <span>menos</span>
      {[0, 0.25, 0.5, 0.75, 1].map((i) => (
        <div
          key={i}
          className="h-3 w-3 rounded-sm border border-border/30"
          style={{
            background:
              i === 0
                ? 'var(--color-secondary)'
                : `color-mix(in oklch, var(--color-primary) ${20 + i * 80}%, transparent)`,
          }}
        />
      ))}
      <span>mais</span>
    </div>
  )
}
