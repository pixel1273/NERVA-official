# NERVA PWA & Android — Implementation Walkthrough

## Summary

Converted the NERVA web frontend into a fully **offline-capable Progressive Web App (PWA)** with mobile-responsive layout, offline report queuing, install-to-home-screen support, and scaffolding for Android APK distribution via TWA.

---

## Changes Made

### Phase 1 — PWA Foundation

| File | Change |
|---|---|
| [`vite.config.js`](file:///c:/New%20folder/NERVA/frontend/vite.config.js) | Added **Workbox runtime caching** strategies: CacheFirst for fonts/tiles, NetworkFirst for API calls. Added `display: standalone`, `start_url`, `background_color`, `orientation`, and PNG icon entries to manifest |
| [`index.html`](file:///c:/New%20folder/NERVA/frontend/index.html) | Added `mobile-web-app-capable`, `apple-mobile-web-app-capable`, `theme-color`, `apple-touch-icon`, SEO meta description, updated title to "NERVA Command" |
| [`public/icon-192.png`](file:///c:/New%20folder/NERVA/frontend/public/icon-192.png) | Generated 192×192 PNG icon (required for Android install banner) |
| [`public/icon-512.png`](file:///c:/New%20folder/NERVA/frontend/public/icon-512.png) | Generated 512×512 PNG icon |
| [`public/icon-512-maskable.png`](file:///c:/New%20folder/NERVA/frontend/public/icon-512-maskable.png) | Generated 512×512 maskable PNG icon |

### Phase 2 — Offline Queue for Field Reports

| File | Change |
|---|---|
| [`src/data/offlineQueue.js`](file:///c:/New%20folder/NERVA/frontend/src/data/offlineQueue.js) | **[NEW]** IndexedDB helper with `saveToOfflineQueue()`, `getPendingReports()`, `removeFromQueue()`, `getPendingCount()`, `syncPendingReports()` |
| [`src/components/incidents/ReportIncident.jsx`](file:///c:/New%20folder/NERVA/frontend/src/components/incidents/ReportIncident.jsx) | Modified `handleSubmit` to catch network errors and fall back to IndexedDB queue. Added `savedOffline` state and distinct offline success message |
| [`src/main.jsx`](file:///c:/New%20folder/NERVA/frontend/src/main.jsx) | Added `window.addEventListener('online', ...)` that auto-syncs pending reports when connectivity restores |

### Phase 3 — Install App Feature

| File | Change |
|---|---|
| [`src/hooks/useInstallPrompt.js`](file:///c:/New%20folder/NERVA/frontend/src/hooks/useInstallPrompt.js) | **[NEW]** React hook capturing `beforeinstallprompt` event + `triggerInstall()` function |
| [`src/components/layout/InstallBanner.jsx`](file:///c:/New%20folder/NERVA/frontend/src/components/layout/InstallBanner.jsx) | **[NEW]** Dismissible banner prompting staff to install the PWA |
| [`src/components/install/InstallPage.jsx`](file:///c:/New%20folder/NERVA/frontend/src/components/install/InstallPage.jsx) | **[NEW]** Full install page with status cards (network, app, pending reports), install CTA, features grid, manual install instructions, and APK download section |
| [`src/components/install/InstallPage.css`](file:///c:/New%20folder/NERVA/frontend/src/components/install/InstallPage.css) | **[NEW]** Styles for the install page with responsive breakpoints |
| [`src/App.jsx`](file:///c:/New%20folder/NERVA/frontend/src/App.jsx) | Added `InstallPage` import and `/install` route |
| [`src/components/layout/Sidebar.jsx`](file:///c:/New%20folder/NERVA/frontend/src/components/layout/Sidebar.jsx) | Added "Install App" nav item with `Download` icon |

### Phase 4 — Mobile-Responsive Layout

| File | Change |
|---|---|
| [`src/components/layout/Layout.jsx`](file:///c:/New%20folder/NERVA/frontend/src/components/layout/Layout.jsx) | Added mobile hamburger `☰` button, sidebar overlay, `InstallBanner`, `BottomNav`, and auto-close-on-navigate logic |
| [`src/components/layout/Layout.css`](file:///c:/New%20folder/NERVA/frontend/src/components/layout/Layout.css) | Added hamburger button styles, overlay styles, and `@media (max-width: 768px)` rules for mobile layout |
| [`src/components/layout/Sidebar.jsx`](file:///c:/New%20folder/NERVA/frontend/src/components/layout/Sidebar.jsx) | Accepts `isOpen`/`onClose` props, added close `✕` button (visible on mobile only) |
| [`src/components/layout/Sidebar.css`](file:///c:/New%20folder/NERVA/frontend/src/components/layout/Sidebar.css) | Added mobile slide-in transform, close button styles, and responsive `@media` rules |
| [`src/components/layout/BottomNav.jsx`](file:///c:/New%20folder/NERVA/frontend/src/components/layout/BottomNav.jsx) | **[NEW]** Mobile bottom navigation (Overview, Report, Reports, Install) visible only on `<768px` |
| [`src/components/layout/BottomNav.css`](file:///c:/New%20folder/NERVA/frontend/src/components/layout/BottomNav.css) | **[NEW]** Bottom nav styles with `safe-area-inset-bottom` support |

### Phase 5 — Android Studio TWA

| File | Change |
|---|---|
| [`andriod/README.md`](file:///c:/New%20folder/NERVA/andriod/README.md) | **[NEW]** Complete setup guide for TWA: Bubblewrap CLI, manual setup, emulator testing, APK building, and distribution |
| [`public/.well-known/assetlinks.json`](file:///c:/New%20folder/NERVA/frontend/public/.well-known/assetlinks.json) | **[NEW]** Digital Asset Links template for TWA domain verification |

### Phase 6 — APK Download

Included directly in the InstallPage as a "Coming Soon" section with badge.

---

## Build Verification

```
✓ vite build — exit code 0
✓ PWA v1.3.0 — mode generateSW
✓ 16 entries pre-cached (1450.27 KiB)
✓ Service Worker generated (sw.js + workbox-c3716bd4.js)
✓ manifest.webmanifest generated
```

---

## How Staff Will Use This

1. **On a phone browser**: Visit the NERVA URL in Chrome → see the install banner → tap "Install" → app appears on home screen
2. **Offline**: Open the app → go to `/report` → fill in and submit → report saved to IndexedDB with "Saved Offline" message
3. **Back online**: Reports auto-sync in the background, visible count on `/install` page with "Sync Now" button
4. **On mobile**: Bottom nav for quick access, hamburger menu for full sidebar

## Next Steps to Get the APK

1. **Deploy the frontend** to a public HTTPS URL (Vercel/Netlify)
2. Run `npx @nickvdp/nickvdp init --manifest=https://your-domain.com/manifest.webmanifest` in the `andriod/` folder
3. Open in Android Studio → Build → Generate Signed APK
4. Update the `assetlinks.json` SHA256 fingerprint
5. Host the APK file and update the `/install` page download link
