import { createFileRoute } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { StudySession } from '@/features/study/study-session'

export const Route = createFileRoute('/study/session/$id')({ component: SessionPage })

function SessionPage() {
  const { id: idStr } = Route.useParams()
  const id = Number(idStr)
  const session = useLiveQuery(() => db.sessions.get(id), [id])
  if (!session) return <div className="p-10 text-sm text-muted-foreground">Carregando…</div>
  return <StudySession session={session} />
}
