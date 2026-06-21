'use client'
import { useEffect } from 'react'

export function useKeyboard(handlers: Record<string, () => void>) {
  useEffect(() => {
    let lastKey = ''
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement || 
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) return
      
      // Ignore modifier combinations (except Shift)
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const combo = lastKey + e.key
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      if (handlers[combo]) { e.preventDefault(); handlers[combo]!(); lastKey = ''; return }
      if (handlers[e.key]) { e.preventDefault(); handlers[e.key]!(); lastKey = ''; return }
      lastKey = e.key
      setTimeout(() => { lastKey = '' }, 800)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handlers])
}
