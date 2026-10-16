# Implementation Plan: Admin Dashboard

**Branch**: `001-admin-dashboard` | **Date**: 2026-10-16 | **Spec**: [spec.md](spec.md)

## Summary
Turn the 7-artboard design canvas into a working multi-page static admin under `admin/`. Shared CSS tokens, one data store that looks like the future API, one shell script for sidebar/header/palette/theme/toasts, and one small script per page.

## Technical Context
**Language**: HTML5, CSS (custom properties, grid, flex), vanilla ES2020 JavaScript
**Dependencies**: none at runtime; Google Fonts (IBM Plex Sans Arabic, Lalezar, Outfit)
**Storage**: `localStorage` behind `SeragStore` (key prefix `serag_admin_`), falls back to memory
**Testing**: manual acceptance per user story in the in-app browser + console error check; desktop 1440 and phone 375
**Target**: modern Chrome/Safari/Firefox, served statically next to the storefront (same origin, so the admin can read `serag_order`)
**Constraints**: no build step, RTL, works from `file://` and any static host

## Constitution Check
| Principle | How the plan meets it |
|---|---|
| I Static-first | Plain files, no bundler; each page loads 3 shared scripts + its own |
| II Arabic RTL | `dir="rtl"`, Egyptian copy lifted from the design canvas |
| III One brand system | All colors in `:root` tokens, dark theme overrides the same tokens |
| IV Backend-ready | `SeragStore.orders.list()/update()` etc. mirror `/api/*` |
| V Accessible | Native controls, focus rings, 44px targets, 375px layout |

## Project Structure
```text
admin/
├── index.html          # نظرة عامة (Overview)
├── cms.html            # محرر الموقع
├── orders.html         # الطلبات
├── products.html       # المنتجات
├── customers.html      # العملاء والتجّار
├── settings.html       # الإعدادات
└── assets/
    ├── admin.css       # tokens (light + dark), layout, components, print
    ├── seed.js         # demo data; products copied from config.js CATALOG
    ├── store.js        # SeragStore: persistence + API-shaped methods + events
    ├── shell.js        # Admin: sidebar, header, drawer, palette, shortcuts, theme, toast, helpers
    └── pages/
        ├── overview.js
        ├── cms.js
        ├── orders.js
        ├── products.js
        ├── customers.js
        └── settings.js
```

## Key Design Decisions
1. **Multi-page, shared shell** instead of one SPA: each page is a real URL the backend can later serve, and pages are independent to build and delegate. `shell.js` injects the sidebar/header from `<body data-page="orders">`.
2. **Render by string templates** with an `esc()` helper and event delegation (`data-act="..."`). Small, readable, no framework.
3. **Store events**: `SeragStore.on('change', fn)` lets the sidebar badges and command palette update when any page changes data.
4. **Storefront bridge**: on load the store merges `localStorage.serag_order` (written by `checkout.html`) as order `source: 'storefront'`.
5. **Theme**: `html[data-theme]` set before paint from saved choice or `prefers-color-scheme`.

## Delegation
Foundation (css, store, seed, shell) and the high-traffic pages (overview, orders, products, cms) are written here. `customers` and `settings` pages are delegated to Antigravity (`agy`) with briefs that point at the finished foundation, then reviewed and fixed here before landing.

## Complexity Tracking
None — no principle is violated.
