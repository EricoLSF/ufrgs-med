import { AlertCircle, Cloud, CloudOff, Loader2, Maximize2, Minimize2, Monitor, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUI, type Theme } from '@/stores/ui'
import { useSync } from '@/lib/drive/sync'
import { cn } from '@/lib/utils'

const themeOrder: Theme[] = ['system', 'light', 'dark']
const themeIcon = { system: Monitor, light: Sun, dark: Moon }

export function Topbar() {
  const { theme, setTheme, focus, toggleFocus } = useUI()
  const sync = useSync()
  const Icon = themeIcon[theme]

  function cycleTheme() {
    const i = themeOrder.indexOf(theme)
    setTheme(themeOrder[(i + 1) % themeOrder.length])
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <SyncIndicator />
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleFocus}
          title={focus ? 'Sair do modo foco' : 'Modo foco'}
        >
          {focus ? <Minimize2 /> : <Maximize2 />}
        </Button>
        <Button variant="ghost" size="icon" onClick={cycleTheme} title={`Tema: ${theme}`}>
          <Icon />
        </Button>
      </div>
    </header>
  )

  function SyncIndicator() {
    if (sync.state === 'disabled') {
      return (
        <span className="inline-flex items-center gap-1.5 opacity-60">
          <CloudOff className="h-3.5 w-3.5" /> local apenas
        </span>
      )
    }
    if (sync.state === 'syncing' || sync.state === 'connecting') {
      return (
        <span className="inline-flex items-center gap-1.5">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {sync.message ?? 'sincronizando…'}
        </span>
      )
    }
    if (sync.state === 'error') {
      return (
        <span className={cn('inline-flex items-center gap-1.5 text-destructive')} title={sync.message}>
          <AlertCircle className="h-3.5 w-3.5" /> erro de sync
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5">
        <Cloud className="h-3.5 w-3.5" /> sincronizado
        {sync.lastSyncAt && (
          <span className="opacity-50">· {formatTime(sync.lastSyncAt)}</span>
        )}
      </span>
    )
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('pt-BR')
}
