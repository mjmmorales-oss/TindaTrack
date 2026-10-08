# AGENTS.md — TindaTrack workspace rules

You are working on **TindaTrack**, a web-based POS and inventory system for Philippine sari-sari stores (school project for Integrative Programming: React + Laravel, separate deployments). The full plan is in `docs/TINDATRACK_BLUEPRINT.md` — read the sections a prompt references before changing code.

## Project shape
- Monorepo: `backend/` = Laravel 13 API (Breeze `api` stack + Sanctum **bearer tokens**), deploys to Railway with MySQL. `frontend/` = React 19 SPA (Vite 8, JavaScript/JSX), deploys to Vercel. Root `package.json` only runs both (`npm run dev`).
- **Phase 3 scope:** Business data (products, categories, sales, customers, utang, stock, reports, staff, settings) is fully implemented in the real Laravel API and MySQL database. Mock data is retained in `frontend/src/mocks` as an offline/development fallback controlled via `VITE_DATA_SOURCE=mock` (`api` is the default). Railway and Vercel deploy targets stay.

## Backend rules (Laravel)
- PHP 8.3+, Laravel 13, PSR-12; run `./vendor/bin/pint` and `php artisan test` before finishing.
- Auth is token-based: login/register return `{ user, token }`; logout deletes `currentAccessToken()`. Never re-enable Sanctum's stateful/cookie SPA middleware (`statefulApi`, `EnsureFrontendRequestsAreStateful`) and never call `$request->session()` in API code.
- Auth routes live in `routes/auth.php`, required from `routes/api.php` (URLs are `/api/*`).
- Middleware aliases: `auth:sanctum`, `active` (EnsureUserIsActive), `role:owner` / `role:owner,cashier` (EnsureUserHasRole), `verified` (Breeze, unused for now). `ForceJsonResponse` is prepended to the api group. Errors are JSON: 401, 403 `{message}`, 422 `{message, errors}`.
- Roles: `App\Enums\UserRole` (`owner`, `cashier`), cast on the `User` model. Single resources are unwrapped (`JsonResource::withoutWrapping()`).
- CORS origins come from `CORS_ALLOWED_ORIGINS` (comma list) and `CORS_ALLOWED_ORIGIN_PATTERNS`; `supports_credentials` is false.
- Seeders must be idempotent (`updateOrCreate`) because they run on every deploy.

## Frontend rules (React)
- **JavaScript only** (`.jsx` for components, `.js` otherwise). Never create `.ts/.tsx`. shadcn `components.json` must keep `"tsx": false`.
- Imports use the `@/` alias (`@/components/ui/button`). React Router v8: import from `react-router` (never `react-router-dom`).
- Styling: Tailwind CSS v4, **mobile-first** classes. Use theme tokens (`bg-primary`, `text-utang`, `bg-highlight`, `text-success`…) — never hard-coded hex colors in components.
- UI: shadcn/ui on **Radix** (style Vega) in `src/components/ui` — add with `npx shadcn@latest add <name>`; don't hand-write or heavily edit these files; extend through wrappers in `src/components/common|forms|data-table|layout`. Icons: `lucide-react` only.
- Reuse before creating: check `src/components/*` (StatCard, Money, StatusBadge, DataTable, ResponsiveDialog, ConfirmDialog, EmptyState, ErrorState, MoneyInput, QuantityStepper, SearchInput, DateRangePicker, UserAvatar, ProductThumb, PageHeader…) before writing new UI.
- Toasts only through `@/lib/notify`. Avatars only through `@/lib/avatar`. Currency/dates only through `@/lib/format` (`₱` via `Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })`; money rounded with `toMoney`).
- State: auth in `AuthContext` (`useAuth()`); server/mock data via **TanStack Query** hooks in `src/features/*/hooks` (never call services directly from components); cart and UI prefs in Zustand (`src/stores`); form state via React Hook Form + Zod (`schemas.js` per feature); table filters synced to the URL (`useTableParams`).
- Services (`src/services/*.js`) are the ONLY place that touches mock data. They are async, simulate latency, return `{ data }` or `{ data, meta }` (Laravel paginator meta), and throw `ApiError` with Laravel shapes (422 `{message, errors}`, 403, 404). Each service documents its future Laravel endpoint. Business rules (stock checks, utang balance, void reversal, delete guards, stock movements) live in services, not components.
- Permissions: check abilities with `usePermissions().can('ability')`, `<Can>` and `RoleRoute`; the ability map is `src/config/permissions.js` (Owner: everything; Cashier: pos.use, products.view, customers.view, customers.manage, utang.record_payment, account.manage). Navigation comes from `src/config/nav.js`.
- Folder layout: `src/features/<feature>/{pages,components,hooks,schemas.js}`; shared code in `components/`, `hooks/`, `lib/`, `config/`, `context/`, `stores/`, `services/`, `mocks/`. Features never import another feature's internals. Components `PascalCase.jsx`, hooks `useX.js`, one component per file, JSDoc on exported components.

## UX rules
- Every page: PageHeader, `useDocumentTitle`, loading skeleton, empty state with CTA, error state with Retry, data state.
- Responsive at 360 / 768 / 1024 / 1280 / 1536 px; no horizontal page scroll; tables render mobile cards below `md`; create/edit forms use `ResponsiveDialog` (Drawer on phones); touch targets ≥ 44px; inputs ≥ 16px on phones.
- Destructive actions use `ConfirmDialog`; voids need a reason. Never let stock go negative.
- Accessibility: visible focus, `aria-label` + Tooltip on icon-only buttons, status shown with icon/text not color alone, AA contrast in light and dark, respect `prefers-reduced-motion`.
- Motion: `motion/react`, subtle (≤ 400 ms), purposeful.
- Copy: short, warm, verb buttons; local terms as helpers (Utang, Suki, Sukli, Benta). Store: "Tindahan ni Aling Nena".

## Working style
- Before large changes, present a short plan; after changes, run `npm run build` (frontend) and/or `php artisan test` (backend) and verify in the browser at phone and desktop widths.
- Don't install new libraries beyond the blueprint's stack without saying why.
- Never commit `.env` files or secrets. Keep commits small: `feat(pos): …`, `fix(auth): …`, `chore: …`.
- If a command or package name in the blueprint fails (versions change), look up the current official docs, use the closest correct equivalent, and report what you changed.
