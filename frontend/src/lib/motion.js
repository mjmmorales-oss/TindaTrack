/**
 * Shake-tolerant motion measurement and the auto-capture state machine (v2.3).
 *
 * The old check counted the share of pixels whose brightness changed by > 20/255
 * and called anything above 4.5 % "moving". A hand-held phone, autofocus and
 * auto-exposure exceed that constantly, so it never became steady. Here frames
 * are blurred (3×3) and mean-subtracted (exposure drift cancels out), then the
 * mean absolute difference is scored 0–100. Everything is pure so tests can feed
 * synthetic frames and a fake clock.
 */

/**
 * RGBA pixels → luma (BT.601) as Float32Array.
 *
 * @param {Uint8ClampedArray|number[]} rgba
 * @returns {{ luma: Float32Array, mean: number }}
 */
export function toLuma(rgba) {
  const n = Math.floor(rgba.length / 4)
  const luma = new Float32Array(n)
  let sum = 0
  for (let i = 0; i < n; i++) {
    const v = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2]
    luma[i] = v
    sum += v
  }
  return { luma, mean: n ? sum / n : 0 }
}

/**
 * 3×3 box blur (edges clamp). Removes sensor noise and sub-pixel shake.
 *
 * @param {Float32Array} src
 * @param {number} w
 * @param {number} h
 */
export function boxBlur3(src, w, h) {
  const out = new Float32Array(src.length)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0
      let count = 0
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= h) continue
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx
          if (xx < 0 || xx >= w) continue
          sum += src[yy * w + xx]
          count++
        }
      }
      out[y * w + x] = sum / count
    }
  }
  return out
}

/**
 * Blurred, mean-subtracted luma signature of one sampled frame.
 *
 * @returns {{ signature: Float32Array, mean: number }}
 */
export function frameSignatureFromRgba(rgba, w, h) {
  const { luma, mean } = toLuma(rgba)
  const blurred = boxBlur3(luma, w, h)
  for (let i = 0; i < blurred.length; i++) blurred[i] -= mean
  return { signature: blurred, mean }
}

/**
 * Mean absolute difference of two signatures on a 0–100 scale (100 = 255 levels).
 *
 * @param {Float32Array|null} a
 * @param {Float32Array|null} b
 * @returns {number}
 */
export function motionScore(a, b) {
  if (!a || !b || a.length !== b.length || a.length === 0) return 100
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i])
  return (sum / a.length / 255) * 100
}

/**
 * The auto-capture state machine. Call `step()` with every sampled frame.
 *
 * States: 'looking' → 'hold_still' (steady, waiting `steadyMs`) → 'countdown'
 * (ring fills over `countdownMs`) → fire → 'capturing' (until `rearm()`).
 * Also 'dark' and 'unchanged' (same as the photo just taken, only for
 * `sceneGuardMs` after it).
 *
 * @param {{ motionThreshold: number, steadyMs: number, countdownMs: number, sceneGuardMs: number,
 *   sceneGuardThreshold: number, minLuminance: number, cooldownMs: number, abortHintCount: number }} config
 */
export function createAutoCaptureMachine(config) {
  let prev = null
  let lastCapture = null
  let lastCaptureAt = -Infinity
  let steadySince = null
  let countdownSince = null
  let armed = true
  let armedAt = 0
  let aborts = 0

  const snapshot = (state, extra = {}) => ({
    state,
    ringProgress: 0,
    showHint: aborts >= config.abortHintCount,
    abortCount: aborts,
    fire: false,
    ...extra,
  })

  return {
    /**
     * @param {{ now: number, signature: Float32Array, mean: number }} frame
     */
    step({ now, signature, mean }) {
      const motion = motionScore(prev, signature)
      prev = signature

      if (!armed) return snapshot('capturing', { motion })
      if (now < armedAt) return snapshot('cooldown', { motion })

      if (mean < config.minLuminance) {
        steadySince = null
        countdownSince = null
        return snapshot('dark', { motion })
      }

      // Only right after a capture: don't fire again on the very same scene
      if (lastCapture && now - lastCaptureAt < config.sceneGuardMs && motionScore(lastCapture, signature) < config.sceneGuardThreshold) {
        steadySince = null
        countdownSince = null
        return snapshot('unchanged', { motion })
      }

      if (motion > config.motionThreshold) {
        if (countdownSince !== null) aborts++ // keep trying; after a few, show a hint
        steadySince = null
        countdownSince = null
        return snapshot('looking', { motion })
      }

      if (steadySince === null) steadySince = now
      if (now - steadySince < config.steadyMs) return snapshot('hold_still', { motion })

      if (countdownSince === null) countdownSince = now
      const progress = Math.min(1, (now - countdownSince) / config.countdownMs)
      if (progress < 1) return snapshot('countdown', { motion, ringProgress: progress })

      // Fire
      armed = false
      lastCapture = signature
      lastCaptureAt = now
      steadySince = null
      countdownSince = null
      aborts = 0
      return snapshot('capturing', { motion, ringProgress: 1, fire: true })
    },

    /** A photo was taken another way (manual tap): treat it like a capture. */
    markCaptured(now, signature = prev) {
      armed = false
      lastCapture = signature
      lastCaptureAt = now
      steadySince = null
      countdownSince = null
    },

    /**
     * Ready for the next basket. `clearReference` forgets the last photo (review
     * closed / scan again), so the next steady scene always captures.
     */
    rearm(now, { delayMs = config.cooldownMs, clearReference = false } = {}) {
      armed = true
      armedAt = now + delayMs
      steadySince = null
      countdownSince = null
      if (clearReference) lastCapture = null
    },

    isArmed: () => armed,
  }
}
