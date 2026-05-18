import { createFileRoute } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { QuestionEditor } from '@/features/bank/question-editor'

export const Route = createFileRoute('/questions/$id')({ component: EditQuestion })

function EditQuestion() {
  const { id: idStr } = Route.useParams()
  const id = Number(idStr)
  const q = useLiveQuery(() => db.questions.get(id), [id])
  if (!q) return <div className="p-10 text-sm text-muted-foreground">Carregando…</div>
  const { id: _id, createdAt: _c, updatedAt: _u, ...draft } = q
  return <QuestionEditor id={id} initial={draft} />
}
