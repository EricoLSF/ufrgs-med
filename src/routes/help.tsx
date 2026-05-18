import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { FileText } from 'lucide-react'
import { Markdown } from '@/lib/markdown'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/help')({ component: Help })

// Bundle every markdown under docs/ and a few key root files as strings.
// Vite reads at build time, no runtime fetch needed.
const rawDocs = import.meta.glob('/docs/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const rawScraperReadme = import.meta.glob('/scripts/README.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const rawPlan = import.meta.glob('/PLAN.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const rawTodo = import.meta.glob('/TODO.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const rawLog = import.meta.glob('/LOG.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

interface Doc {
  slug: string
  title: string
  content: string
  group: 'guia' | 'projeto'
}

function titleFromMarkdown(md: string, fallback: string): string {
  const h1 = md.match(/^#\s+(.+)$/m)
  return h1?.[1].trim() ?? fallback
}

function titleFromFilename(path: string): string {
  const base = path.split('/').pop()!.replace(/\.md$/, '')
  return base
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function buildDocs(): Doc[] {
  const docs: Doc[] = []
  for (const [path, content] of Object.entries(rawDocs)) {
    docs.push({
      slug: path.split('/').pop()!.replace(/\.md$/, ''),
      title: titleFromMarkdown(content, titleFromFilename(path)),
      content, group: 'guia',
    })
  }
  for (const [path, content] of Object.entries(rawScraperReadme)) {
    docs.push({
      slug: 'scraper', title: titleFromMarkdown(content, 'Scraper UFRGS'),
      content, group: 'guia',
    })
  }
  for (const [path, content] of Object.entries(rawPlan)) {
    docs.push({ slug: 'plan', title: titleFromMarkdown(content, 'Plano'), content, group: 'projeto' })
  }
  for (const [path, content] of Object.entries(rawTodo)) {
    docs.push({ slug: 'todo', title: titleFromMarkdown(content, 'TODO'), content, group: 'projeto' })
  }
  for (const [path, content] of Object.entries(rawLog)) {
    docs.push({ slug: 'log', title: titleFromMarkdown(content, 'Log'), content, group: 'projeto' })
  }
  return docs.sort((a, b) => a.title.localeCompare(b.title))
}

function Help() {
  const docs = useMemo(buildDocs, [])
  const [active, setActive] = useState<string>(() => docs[0]?.slug ?? '')
  const current = docs.find((d) => d.slug === active) ?? docs[0]

  const groups = useMemo(() => {
    const g: Record<Doc['group'], Doc[]> = { guia: [], projeto: [] }
    for (const d of docs) g[d.group].push(d)
    return g
  }, [docs])

  if (!current) {
    return <div className="p-10 text-sm text-muted-foreground">Sem docs ainda.</div>
  }

  return (
    <div className="flex h-full">
      <aside className="hidden w-60 shrink-0 overflow-y-auto border-r border-border bg-sidebar p-3 md:block">
        <div className="space-y-4">
          <NavGroup label="Guia">
            {groups.guia.map((d) => (
              <NavItem key={d.slug} active={d.slug === active} onClick={() => setActive(d.slug)}>{d.title}</NavItem>
            ))}
          </NavGroup>
          <NavGroup label="Projeto">
            {groups.projeto.map((d) => (
              <NavItem key={d.slug} active={d.slug === active} onClick={() => setActive(d.slug)}>{d.title}</NavItem>
            ))}
          </NavGroup>
        </div>
      </aside>
      <article className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl p-6 md:p-10">
          <Markdown>{current.content}</Markdown>
        </div>
      </article>
    </div>
  )
}

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

function NavItem({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors',
        active ? 'bg-accent text-accent-foreground font-medium' : 'hover:bg-accent/40 text-muted-foreground',
      )}
    >
      <FileText className="h-3.5 w-3.5 shrink-0 opacity-60" />
      <span className="truncate">{children}</span>
    </button>
  )
}
