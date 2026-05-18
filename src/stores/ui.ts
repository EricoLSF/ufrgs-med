import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'

interface UIState {
  theme: Theme
  setTheme: (t: Theme) => void
  focus: boolean
  toggleFocus: () => void
  fontScale: number
  setFontScale: (n: number) => void
}

export const useUI = create<UIState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      focus: false,
      toggleFocus: () => set((s) => ({ focus: !s.focus })),
      fontScale: 1,
      setFontScale: (fontScale) => set({ fontScale }),
    }),
    { name: 'ufrgs-med:ui' },
  ),
)
