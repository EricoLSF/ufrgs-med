import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { useUI } from '@/stores/ui'
import { useShortcuts } from '@/lib/shortcuts'
import { cn } from '@/lib/utils'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
})

function RootLayout() {
  const focus = useUI((s) => s.focus)
  const toggleFocus = useUI((s) => s.toggleFocus)

  useShortcuts({ f: () => toggleFocus() })

  return (
    <div className={cn('flex h-screen overflow-hidden bg-background text-foreground', focus && 'text-[17px]')}>
      {!focus && <Sidebar />}
      <div className="flex flex-1 flex-col overflow-hidden">
        {!focus && <Topbar />}
        <main className={cn('flex-1 overflow-y-auto', focus && 'p-0')}>
          <Outlet />
        </main>
        {focus && (
          <div className="pointer-events-none fixed bottom-4 right-4 rounded-md border border-border bg-card/80 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur">
            modo foco — <kbd className="font-mono">F</kbd> sai
          </div>
        )}
      </div>
    </div>
  )
}
