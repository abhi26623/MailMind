'use client'
import { useEffect } from 'react'

export function useKeyboard(handlers: Record<string, () => void>) {
  useEffect(() => {
    let lastKey = ''
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const combo = lastKey + e.key
      if (handlers[combo]) { handlers[combo]!(); lastKey = ''; return }
      if (handlers[e.key]) { handlers[e.key]!(); lastKey = ''; return }
      lastKey = e.key
      setTimeout(() => { lastKey = '' }, 800)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handlers])
}
