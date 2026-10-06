import { useEffect } from 'react'

/**
 * Listen for hotkeys (e.g. 'k' with meta/ctrl key, 'Escape', etc.)
 * @param {string} key
 * @param {(e: KeyboardEvent) => void} callback
 * @param {{ metaOrCtrl?: boolean, preventDefault?: boolean }} [options]
 */
export function useHotkey(key, callback, options = {}) {
  const { metaOrCtrl = false, preventDefault = true } = options

  useEffect(() => {
    function handleKeyDown(e) {
      const isKeyMatch = e.key.toLowerCase() === key.toLowerCase()
      const isMetaMatch = metaOrCtrl ? e.metaKey || e.ctrlKey : true

      if (isKeyMatch && isMetaMatch) {
        if (preventDefault) {
          e.preventDefault()
        }
        callback(e)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [key, callback, metaOrCtrl, preventDefault])
}
