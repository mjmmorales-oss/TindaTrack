import { useEffect, useRef } from 'react'

/**
 * Hook to listen for rapid keyboard wedge input emitted by hardware USB or Bluetooth barcode scanners.
 * Buffers keystrokes arriving within 50ms of each other and flushes upon Enter key.
 *
 * @param {object} options
 * @param {(barcode: string) => void} options.onScan - Handler called when full barcode is scanned
 * @param {boolean} [options.enabled=true] - Whether hardware wedge listener is active
 * @param {number} [options.maxIntervalMs=50] - Maximum millisecond threshold between consecutive keys
 * @param {number} [options.minLength=6] - Minimum character length for valid barcode
 */
export function useBarcodeWedge({
  onScan,
  enabled = true,
  maxIntervalMs = 50,
  minLength = 6,
} = {}) {
  const bufferRef = useRef([])
  const lastKeyTimeRef = useRef(0)

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e) => {
      // Ignore keystrokes when user is focused inside a text area or a normal input
      // unless the input is explicitly tagged with `data-barcode-input`
      const target = e.target
      const tagName = target?.tagName
      const isInput = tagName === 'INPUT'
      const isTextarea = tagName === 'TEXTAREA'

      if (isTextarea) return
      if (isInput && !target.hasAttribute('data-barcode-input')) return

      const now = Date.now()
      const interval = now - lastKeyTimeRef.current

      // If typing speed is human/slow, reset buffer
      if (interval > maxIntervalMs && bufferRef.current.length > 0) {
        bufferRef.current = []
      }

      lastKeyTimeRef.current = now

      if (e.key === 'Enter') {
        const scanned = bufferRef.current.join('').trim()
        bufferRef.current = []

        if (scanned.length >= minLength) {
          e.preventDefault()
          e.stopPropagation()
          onScan?.(scanned)
        }
      } else if (e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        bufferRef.current.push(e.key)
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [enabled, onScan, maxIntervalMs, minLength])
}
