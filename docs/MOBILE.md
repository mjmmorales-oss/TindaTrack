# TindaTrack Mobile Architecture & Verification Guide (v1.3.0)

This document details the mobile input, keyboard handling, and overlay architecture for TindaTrack, along with manual verification checklists for physical iOS (Safari) and Android (Chrome) devices.

---

## 1. Root Causes & Architecture

### iOS Input Zoom Prevention (Task U2)
* **Root Cause:** iOS Safari automatically zooms the entire webpage whenever an `<input>`, `<textarea>`, or `<select>` receives focus if its computed font size is below `16px`.
* **Fix Applied:**
  * Added a Tailwind 4 `@layer base` safety floor in `src/index.css` restricted to coarse-pointer (touch) devices:
    ```css
    @media (pointer: coarse) {
      input:not([type='checkbox']):not([type='radio']):not([type='range']):not([type='color']),
      textarea, select, [contenteditable='true'], [cmdk-input] {
        font-size: max(16px, 1em) !important;
      }
    }
    ```
  * Desktop density remains untouched (`pointer: fine`).
  * Updated `index.html` viewport meta:
    ```html
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content" />
    ```
  * Enforced via automated linter `scripts/check-mobile.mjs`.

---

### Mobile Drawers & Sheets with Virtual Keyboard Open (Task U3)
* **Root Causes:**
  1. On iOS Safari, the on-screen keyboard shrinks only `window.visualViewport`. Elements styled with standard `100vh` or fixed positioning remain sized to the layout viewport, resulting in blank space or cut-off content.
  2. Vaul's default `repositionInputs={true}` transforms inputs upwards when focused, causing jitter and conflicting with dynamic viewport sizing.
  3. Fixed elements like `MobileBottomNav` and `MobileCartBar` remain visible and float mid-screen above the keyboard.
* **Fixes Applied:**
  1. **`useVisualViewport.js` Hook:**
     - Subscribes to `window.visualViewport` `resize` and `scroll` events using `requestAnimationFrame`.
     - Dynamically writes CSS variables `--vvh` (visual viewport height in px) and `--keyboard-inset` to `document.documentElement`.
     - Toggles `document.documentElement.dataset.keyboard = 'open' | 'closed'` when keyboard inset exceeds 120px.
  2. **Drawer & Sheet Sizing:**
     - All bottom drawers (`ResponsiveDialog`, `CartDrawer`, `DataTableToolbar`, `DateRangePicker`, `MoreSheet`) use:
       ```css
       max-height: calc(var(--vvh, 100dvh) - env(safe-area-inset-top) - 12px);
       ```
     - Passed `repositionInputs={false}` to Vaul Drawer roots.
     - Drawer bodies use `overscroll-contain overflow-y-auto` with a 250ms smooth center scroll on input focus:
       `target.scrollIntoView({ block: 'center', behavior: 'smooth' })`.
     - Drawer footers use sticky bottom positioning with safe area insets:
       `sticky bottom-0 z-10 border-t pb-[max(12px, env(safe-area-inset-bottom))]`.
  3. **Overlay & Nav Coordination:**
     - `useOverlayStore.js` maintains an active modal counter.
     - `MobileBottomNav` and `MobileCartBar` hide (`display: none` / `hidden`) whenever `data-keyboard='open'` or `activeModalCount > 0`.

---

## 2. Manual Device Verification Checklist

Because browser automation tools cannot simulate iOS Safari's native software keyboard geometry, run these manual device checks on an iPhone and an Android phone running on local network (`npm run dev:lan`).

### Pre-test Setup
1. Start dev server: `npm run dev:lan`.
2. Connect your mobile device to the same Wi-Fi network and open the LAN URL printed in the terminal (e.g. `http://192.168.x.x:5173`).
3. Log in as Owner (`nena@tindatrack.ph`).

---

### Checklist A: iOS Safari (iPhone)
| # | Step | Expected Behavior | Pass/Fail |
|---|------|-------------------|-----------|
| 1 | **Login Page**<br>Tap Email and Password inputs. | No page zoom occurs (text stays at native scale). Double-tap does not trigger unwanted zoom. | [ ] |
| 2 | **POS Page - Product Search**<br>Tap the search bar at top. | Keyboard opens smoothly. Search bar remains visible. Bottom navigation hides cleanly without shifting mid-screen. | [ ] |
| 3 | **POS Page - Cart Drawer**<br>Add items, open Cart Drawer, tap quantity inputs or notes. | Drawer shrinks to visual viewport height. Footer ("Pay") stays accessible. Inputs smoothly scroll to center. | [ ] |
| 4 | **POS Page - Payment Modal**<br>Tap "Pay", select Cash, tap the Cash Received input. | Quick cash buttons and received input stay visible above the keyboard. No blank gaps under the modal. | [ ] |
| 5 | **Products Page - Add by Barcode**<br>Tap "Add by barcode". Tap the barcode text input. | Camera preview or typed input stays visible. Bottom navigation remains hidden. | [ ] |
| 6 | **Products Page - Product Form**<br>Tap "+ Add product", tap Name, Price, Cost, and Stock inputs. | Drawer body scrolls freely without rubber-banding document body behind it. Focused input centers after 250ms. | [ ] |
| 7 | **Staff Management Dialogs**<br>Open Staff page, tap "Add staff", tap Name, Email, Password. | Temporary password generation displays cleanly. Virtual keyboard does not obscure buttons. | [ ] |
| 8 | **Closing Virtual Keyboard**<br>Tap "Done" or tap outside to close keyboard. | Viewport restores to full height immediately. Bottom navigation reappears smoothly at the screen bottom. | [ ] |

---

### Checklist B: Android Chrome
| # | Step | Expected Behavior | Pass/Fail |
|---|------|-------------------|-----------|
| 1 | **Viewport Resize**<br>Tap any input inside POS or Products form. | Chrome on Android honors `interactive-widget=resizes-content`, resizing page smoothly. | [ ] |
| 2 | **No Text Zoom**<br>Focus any input. | No automatic page enlargement. Content retains 1:1 scale. | [ ] |
| 3 | **Bottom Navigation**<br>Verify bottom navigation during typing. | Navigation remains hidden while keyboard is open. | [ ] |
| 4 | **Sticky Footer**<br>Scroll drawer content with keyboard up. | Action buttons (Save, Pay, Confirm) remain visible and clickable at the bottom of the drawer. | [ ] |
