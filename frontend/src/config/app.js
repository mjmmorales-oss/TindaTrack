/**
 * Application-wide configuration and feature flags.
 *
 * Demo accounts helper is visible only in local development (import.meta.env.DEV)
 * and can be opted out locally via VITE_SHOW_DEMO_ACCOUNTS='false'.
 * Production builds always evaluate import.meta.env.DEV to false.
 */
export const SHOW_DEMO_ACCOUNTS =
  import.meta.env.DEV && import.meta.env.VITE_SHOW_DEMO_ACCOUNTS !== 'false'
