import { createFileRoute } from '@tanstack/react-router'
import { QuestionEditor } from '@/features/bank/question-editor'

export const Route = createFileRoute('/questions/new')({ component: () => <QuestionEditor /> })
