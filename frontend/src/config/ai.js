/**
 * AI & Auto-Capture Configuration Constants
 */

export const AUTO_CAPTURE_DEFAULT = true

export const AUTO_CAPTURE = {
  SAMPLE_WIDTH: 64,
  SAMPLE_HEIGHT: 48,
  SAMPLE_INTERVAL_MS: 100, // ~10 fps
  // Score = mean |Δ| of blurred, exposure-compensated luma, 0–100 (see lib/motion.js).
  // Hand shake / autofocus / exposure drift stay well below 6; moving the phone is 10+.
  MOTION_THRESHOLD: 6,
  STEADY_DURATION_MS: 800, // hold still this long before the ring starts
  COUNTDOWN_MS: 1000, // ring fills, then capture
  SCENE_GUARD_MS: 3000, // only right after a capture…
  SCENE_GUARD_THRESHOLD: 3, // …and only for a near-identical scene
  MIN_LUMINANCE: 35, // reject pitch-black frames (0-255 scale)
  AUTO_COOLDOWN_MS: 1500, // minimum time between auto-captures after re-arm
  EMPTY_REARM_MS: 2000, // "Nothing detected": try again after this
  ABORT_HINT_COUNT: 3, // aborted rings before the "hold still" hint (never gives up)
}

export const AUTO_CAPTURE_SENSITIVITY = {
  // low = careful (needs a steadier, longer hold); high = captures most readily
  low: {
    motionThreshold: 4,
    steadyDurationMs: 1100,
  },
  medium: {
    motionThreshold: 6,
    steadyDurationMs: 800,
  },
  normal: {
    motionThreshold: 6,
    steadyDurationMs: 800,
  },
  high: {
    motionThreshold: 9,
    steadyDurationMs: 600,
  },
}

/**
 * Returns tuned motion threshold and steady duration based on sensitivity setting.
 *
 * @param {'low'|'medium'|'high'} [sensitivity='medium']
 * @returns {{ motionThreshold: number, steadyDurationMs: number }}
 */
export function getAutoCaptureProfile(sensitivity = 'medium') {
  return AUTO_CAPTURE_SENSITIVITY[sensitivity] || AUTO_CAPTURE_SENSITIVITY.medium
}

/**
 * Browser timeout for AI photo requests: above the server's worst case
 * (AI_PRIMARY_TIMEOUT 12 s + AI_FALLBACK_TIMEOUT 15 s + upload), so the browser
 * never aborts a scan the server is still finishing.
 */
export const AI_REQUEST_TIMEOUT_MS = 45000

/**
 * The one resize/compress setting for every photo sent to Gemini (AI Basket,
 * AI Stock-In, phone basket, Visual Match "Ask AI", AI Lab cases). 1024 px is
 * plenty for "which catalog product is this" and uploads ~3× faster than 1600 px.
 * Stays far below every server limit (AI_MAX_IMAGE_KB 5120, PHP 2 MB).
 */
export const AI_IMAGE_OPTIONS = Object.freeze({ maxDim: 1024, maxBytes: 600 * 1024, initialQuality: 0.8 })
