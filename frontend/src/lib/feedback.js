const SOUND_KEY = 'tt_scan_sound_enabled'

let audioCtx = null

/**
 * Returns whether scanner sound is enabled in localStorage (default true).
 *
 * @returns {boolean}
 */
export function isScanSoundEnabled() {
  try {
    const val = localStorage.getItem(SOUND_KEY)
    return val === null ? true : val === 'true'
  } catch {
    return true
  }
}

/**
 * Persists scanner sound preference to localStorage.
 *
 * @param {boolean} enabled
 */
export function setScanSoundEnabled(enabled) {
  try {
    localStorage.setItem(SOUND_KEY, String(enabled))
  } catch {
    // Ignore storage errors
  }
}

/**
 * Plays a pleasant short high-pitch audio beep using Web Audio API oscillator.
 */
export function beep() {
  if (!isScanSoundEnabled()) return

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return

    if (!audioCtx) {
      audioCtx = new AudioContextClass()
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume()
    }

    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(1400, audioCtx.currentTime) // 1400Hz bright chime
    osc.frequency.exponentialRampToValueAtTime(1800, audioCtx.currentTime + 0.08)

    gain.gain.setValueAtTime(0.15, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08)

    osc.connect(gain)
    gain.connect(audioCtx.destination)

    osc.start()
    osc.stop(audioCtx.currentTime + 0.08)
  } catch {
    // Autoplay restrictions or audio unsupported; fail silently
  }
}

/**
 * Triggers a short 60ms haptic vibration on devices with vibration support.
 */
export function vibrate() {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(60)
    }
  } catch {
    // Ignore vibration failure
  }
}
