import { createFileRoute } from '@tanstack/react-router'
import { StudySetup } from '@/features/study/study-setup'

export const Route = createFileRoute('/study/')({ component: StudySetup })
