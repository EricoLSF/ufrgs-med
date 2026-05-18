import { createFileRoute } from '@tanstack/react-router'
import { QuestionList } from '@/features/bank/question-list'

export const Route = createFileRoute('/questions/')({ component: QuestionList })
