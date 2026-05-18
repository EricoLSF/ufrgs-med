import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { useUI } from '@/stores/ui'
import { cn } from '@/lib/utils'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
})

function RootLayout() {
  const focus = useUI((s) => s.focus)
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {!focus && <Sidebar />}
      <div className="flex flex-1 flex-col overflow-hidden">
        {!focus && <Topbar />}
        <main className={cn('flex-1 overflow-y-auto', focus && 'p-0')}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
