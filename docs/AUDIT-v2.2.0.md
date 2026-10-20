# TindaTrack v2.2.0 — Demo-Day Fixes & Hardening Audit

Branch: `release/v2.2.0` (from `main` @ `8778827`, v2.1.0).

> Note: **G8.5 (whole-system sweep) from the v2.1 prompt has no commit on `main`.** Phase C of this release replaces it.

## Phase 0 — Baseline (before any change)

| Check | Result |
|---|---|
| `php artisan test` | 179 passed (853 assertions) |
| `./vendor/bin/pint --test` | passed |
| `npm run test` (Vitest) | 290 passed (26 files) |
| `npm run lint` (oxlint) | 0 errors, 111 warnings |
| `npm run build` | OK — 184 precache entries (4039.70 KiB) |
| `check:bundle` | clean (103 assets, 0 leaks) |
| `check:i18n` | passed (117 untranslated *candidate* strings reported, 0 errors) |
| `check:mobile` | passed |
| `check:pwa` | passed |
