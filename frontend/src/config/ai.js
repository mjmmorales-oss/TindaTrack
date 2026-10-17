/**
 * AI & Auto-Capture Configuration Constants
 */

export const AUTO_CAPTURE = {
  SAMPLE_WIDTH: 64,
  SAMPLE_HEIGHT: 48,
  MOTION_THRESHOLD_PERCENT: 4.5, // % pixel diff to count as motion
  STEADY_DURATION_MS: 1200, // time frame must stay still
  COUNTDOWN_MS: 1500, // visual countdown before capture
  SCENE_DIFFERENCE_THRESHOLD: 8.0, // must differ from previous capture
  MIN_LUMINANCE: 35, // reject pitch-black frames (0-255 scale)
  AUTO_COOLDOWN_MS: 3000, // minimum time between auto-captures
  MAX_COUNTDOWN_ABORT_COUNT: 3, // if movement cancels countdown 3x, fall back to manual hint
}

export const AUTO_CAPTURE_SENSITIVITY = {
  low: {
    motionThreshold: 6.0,
    steadyDurationMs: 1500,
  },
  medium: {
    motionThreshold: 4.5,
    steadyDurationMs: 1200,
  },
  high: {
    motionThreshold: 3.0,
    steadyDurationMs: 900,
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
