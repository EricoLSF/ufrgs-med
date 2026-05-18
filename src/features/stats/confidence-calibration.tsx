import { useConfidenceCalibration } from './hooks'

const labels = { 1: 'Baixa', 2: 'Média', 3: 'Alta' } as const

export function ConfidenceCalibration() {
  const data = useConfidenceCalibration()
  const hasData = data.some((d) => d.n > 0)

  if (!hasData) {
    return (
      <div className="text-sm text-muted-foreground">
        Quando você marcar confiança ao responder, a calibração aparecerá aqui.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {data.map((d) => (
        <div key={d.confidence} className="rounded-lg border border-border p-3 text-center">
          <div className="text-xs text-muted-foreground">{labels[d.confidence]}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {d.accuracy == null ? '—' : `${Math.round(d.accuracy * 100)}%`}
          </div>
          <div className="text-[11px] text-muted-foreground">{d.n} resposta(s)</div>
        </div>
      ))}
    </div>
  )
}
