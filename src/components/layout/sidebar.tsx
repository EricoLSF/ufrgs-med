import { Link } from '@tanstack/react-router'
import { BarChart3, BookOpen, HelpCircle, Home, Library, Settings, Stethoscope } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
  icon: typeof Home
  exact?: boolean
}

const nav: NavItem[] = [
  { to: '/', label: 'Início', icon: Home, exact: true },
  { to: '/study', label: 'Estudar', icon: BookOpen },
  { to: '/questions', label: 'Questões', icon: Library },
  { to: '/stats', label: 'Estatísticas', icon: BarChart3 },
  { to: '/help', label: 'Ajuda', icon: HelpCircle },
  { to: '/settings', label: 'Configurações', icon: Settings },
]

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
          <Stethoscope className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">UFRGS Med</div>
          <div className="text-[11px] text-muted-foreground">vestibular tracker</div>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 p-2">
        {nav.map(({ to, label, icon: Icon, exact }) => (
          <Link
            key={to}
            to={to as never}
            activeOptions={{ exact: exact ?? false }}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
            )}
            activeProps={{ className: 'bg-accent text-accent-foreground font-medium' }}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <div className="border-t border-sidebar-border p-3 text-[11px] text-muted-foreground">
        <div>Local-first · dados no navegador</div>
      </div>
    </aside>
  )
}
