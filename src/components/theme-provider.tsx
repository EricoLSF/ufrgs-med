import { useEffect } from 'react'
import { useUI } from '@/stores/ui'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useUI((s) => s.theme)
  const fontScale = useUI((s) => s.fontScale)

  useEffect(() => {
    const root = document.documentElement
    const apply = () => {
      root.classList.remove('light', 'dark')
      if (theme === 'system') {
        const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
        root.classList.add(dark ? 'dark' : 'light')
      } else {
        root.classList.add(theme)
      }
    }
    apply()
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontScale * 16}px`
  }, [fontScale])

  return children
}
