# Sprint 5: PWA Basics - Planning Prompt

**Purpose:** This prompt provides context and requirements for implementing PWA (Progressive Web App) capabilities. Your task is to create a detailed implementation plan.

---

## Context

FamilyHub is a family organization app built with React 19 + Vite. The app is designed to run on a shared device (mini PC + monitor in the kitchen) but also needs to work on family members' phones for temporary/mobile access.

**Current State:**
- React 19 + Vite + Tailwind CSS v4
- Responsive calendar views (Schedule auto-defaults on mobile)
- localStorage-based family data persistence
- No service worker or PWA manifest currently

**Primary Use Case:** Desktop/tablet kiosk (always online)
**Secondary Use Case:** Mobile phones for quick access (nice-to-have)

---

## What We're Building

### 1. Web App Manifest

Make the app installable on devices with proper branding:

```json
{
  "name": "FamilyHub",
  "short_name": "FamilyHub",
  "description": "Your family's command center",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#...",  // Match app's primary color
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

**Requirements:**
- App icon (simple, recognizable - could be a house or calendar icon)
- Splash screen support (via manifest + icons)
- Proper theme color matching the app's design

### 2. Service Worker for Static Asset Caching

Cache JS, CSS, and image assets for faster loads:

```
Strategy: Cache-First for static assets
- /assets/*.js
- /assets/*.css
- /icons/*
- /fonts/* (if any)

Strategy: Network-First for HTML (always get latest)
- index.html
```

**What to Cache:**
- Build output (JS bundles, CSS)
- App icons and images
- Fonts (if used)

**What NOT to Cache (for now):**
- API responses (mock data, will be real API in Phase 2)
- Dynamic content

### 3. Vite PWA Plugin

Use `vite-plugin-pwa` for easy integration:

```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: { /* ... */ },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ]
})
```

---

## Technical Requirements

### Icon Assets Needed

| Size | Purpose | File |
|------|---------|------|
| 192x192 | Standard icon | `public/icons/icon-192.png` |
| 512x512 | Large icon / splash | `public/icons/icon-512.png` |
| 512x512 | Maskable (safe zone) | `public/icons/icon-maskable-512.png` |
| 180x180 | Apple touch icon | `public/apple-touch-icon.png` |
| 32x32 | Favicon | `public/favicon-32x32.png` |
| 16x16 | Favicon | `public/favicon-16x16.png` |

**Note:** For MVP, simple placeholder icons are fine. Can be refined later.

### Manifest Placement

```
public/
├── manifest.json (or manifest.webmanifest)
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── icon-maskable-512.png
├── apple-touch-icon.png
├── favicon-32x32.png
├── favicon-16x16.png
└── favicon.ico
```

### HTML Head Updates

```html
<link rel="manifest" href="/manifest.json" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<meta name="theme-color" content="#..." />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
```

---

## Constraints & Non-Goals

### Do NOT:
- Cache API responses (mock data changes, real API coming in Phase 2)
- Implement offline-first data sync (deferred to Phase 2 with real backend)
- Over-engineer caching strategies
- Add push notifications (future feature)

### Keep Simple:
- Basic service worker for asset caching only
- Auto-update strategy (no manual update prompts)
- Simple icon design (can iterate later)

---

## Acceptance Criteria

### Installability
- [ ] App can be installed on Android (Chrome "Add to Home Screen")
- [ ] App can be installed on iOS (Safari "Add to Home Screen")
- [ ] App can be installed on Desktop (Chrome install button)
- [ ] Installed app opens in standalone mode (no browser chrome)

### Icons & Branding
- [ ] App icon appears correctly on home screen
- [ ] Splash screen shows during app load
- [ ] Theme color matches app design
- [ ] Favicon appears in browser tabs

### Caching
- [ ] Static assets (JS, CSS) are cached after first load
- [ ] Subsequent loads are faster (assets served from cache)
- [ ] App updates automatically when new version is deployed

### Lighthouse PWA Audit
- [ ] Passes "Installable" criteria
- [ ] Passes "PWA Optimized" criteria (or most of them)

---

## Reference Files

| Purpose | File |
|---------|------|
| Vite config | `vite.config.ts` |
| HTML template | `index.html` |
| Public assets | `public/` |
| App colors | `src/index.css` (CSS variables) |

---

## Existing Colors (from index.css)

The app uses oklch color space. Key colors for theming:

```css
--background: oklch(0.98 0.01 85);
--primary: oklch(0.55 0.2 250);  /* Blue-ish */
```

Extract these for manifest theme_color.

---

## Deliverable

Create an implementation plan that:

1. Lists required npm packages (e.g., `vite-plugin-pwa`)
2. Specifies icon assets to create (sizes, formats)
3. Details vite.config.ts changes
4. Details index.html changes
5. Describes service worker caching strategy
6. Includes testing steps for each platform (Android, iOS, Desktop)

The plan should be simple and focused - this is MVP PWA functionality.
