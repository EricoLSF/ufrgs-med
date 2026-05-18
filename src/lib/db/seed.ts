import type { Subject } from './schema'

export const defaultSubjects: Omit<Subject, 'id'>[] = [
  { name: 'Português',         color: 'oklch(0.6 0.18 240)',  displayOrder: 1 },
  { name: 'Literatura',        color: 'oklch(0.7 0.18 80)',   displayOrder: 2 },
  { name: 'Língua Estrangeira', color: 'oklch(0.65 0.18 290)', displayOrder: 3 },
  { name: 'Matemática',        color: 'oklch(0.62 0.22 25)',  displayOrder: 4 },
  { name: 'Física',            color: 'oklch(0.7 0.18 55)',   displayOrder: 5 },
  { name: 'Química',           color: 'oklch(0.65 0.18 145)', displayOrder: 6 },
  { name: 'Biologia',          color: 'oklch(0.68 0.18 165)', displayOrder: 7 },
  { name: 'História',          color: 'oklch(0.62 0.18 15)',  displayOrder: 8 },
  { name: 'Geografia',         color: 'oklch(0.65 0.16 195)', displayOrder: 9 },
]
