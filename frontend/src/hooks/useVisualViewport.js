import { useEffect, useState } from 'react'

/**
 * Subscribes to window.visualViewport resize and scroll events.
 * Sets CSS variables:
 *  --vvh: visual viewport height in px
 *  --keyboard-inset: max(0, window.innerHeight - visualViewport.height - visualViewport.offsetTop)
 * Sets document.documentElement.dataset.keyboard = 'open' | 'closed' (open if inset > 120px).
 *
 * @returns {{ visualHeight: number, keyboardInset: number, isKeyboardOpen: boolean }}
 */
export function useVisualViewport() {
  const [state, setState] = useState(() => {
    if (typeof window === 'undefined') {
      return { visualHeight: 0, keyboardInset: 0, isKeyboardOpen: false }
    }
    const height = window.visualViewport?.height ?? window.innerHeight ?? 0
    return { visualHeight: height, keyboardInset: 0, isKeyboardOpen: false }
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return

    let rafId = null

    const update = () => {
      if (rafId) cancelAnimationFrame(rafId)

      rafId = requestAnimationFrame(() => {
        const vv = window.visualViewport
        if (!vv) return

        const visualHeight = Math.round(vv.height)
        const offsetTop = vv.offsetTop || 0
        const innerH = window.innerHeight || visualHeight
        const keyboardInset = Math.max(0, Math.round(innerH - visualHeight - offsetTop))
        const isKeyboardOpen = keyboardInset > 120

        const root = document.documentElement
        root.style.setProperty('--vvh', `${visualHeight}px`)
        root.style.setProperty('--keyboard-inset', `${keyboardInset}px`)
        root.dataset.keyboard = isKeyboardOpen ? 'open' : 'closed'

        setState({ visualHeight, keyboardInset, isKeyboardOpen })
      })
    }

    // Initial update
    update()

    const vv = window.visualViewport
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      const root = document.documentElement
      root.dataset.keyboard = 'closed'
      root.style.removeProperty('--keyboard-inset')
    }
  }, [])

  return state
}

export default useVisualViewport
