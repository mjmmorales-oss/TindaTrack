import { useEffect } from 'react'

/**
 * Listen for hotkeys (e.g. 'k' with meta/ctrl key, 'Escape', etc.)
 * @param {string} key
 * @param {(e: KeyboardEvent) => void} callback
 * @param {{ metaOrCtrl?: boolean, preventDefault?: boolean, ignoreInputs?: boolean }} [options]
 */
export function useHotkey(key, callback, options = {}) {
  const { metaOrCtrl = false, preventDefault = true, ignoreInputs = true } = options

  useEffect(() => {
    function handleKeyDown(e) {
      if (ignoreInputs && !metaOrCtrl) {
        const target = e.target
        const tagName = target?.tagName
        if (
          tagName === 'INPUT' ||
          tagName === 'TEXTAREA' ||
          tagName === 'SELECT' ||
          target?.isContentEditable
        ) {
          return
        }
      }

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
  }, [key, callback, metaOrCtrl, preventDefault, ignoreInputs])
}
