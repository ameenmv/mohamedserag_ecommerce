# Feature Specification: Admin Dashboard (لوحة التحكم)

**Feature Branch**: `001-admin-dashboard`
**Created**: 2026-10-16
**Status**: Prototype done — superseded for production by [docs/PRD.md](../../docs/PRD.md) (E12 Admin). Differences: no trader approvals (traders are WhatsApp-only), bridal reservations live in Orders, single admin role at launch.
**Input**: Build the store admin as static HTML from the "لوحة تحكم محمد سراج" design canvas (https://claude.ai/artifact/AMFAX9qPrpquM8NsJXH5pv), matched to the existing storefront prototype and BRD.md, with something special on top.

## User Scenarios & Testing

### User Story 1 - Morning overview (Priority: P1)
The store manager opens the admin and in one glance sees what needs action today: new orders, trader requests waiting for review, products running out, and revenue for the last 7/30/90 days.

**Independent Test**: Open `admin/index.html`; the hero says how many new orders exist, KPI cards and the revenue chart switch between 7/30/90 days, and "راجع الطلبات" goes to the orders page.

**Acceptance Scenarios**:
1. **Given** 2 orders with status "جديد", **When** the overview loads, **Then** the hero reads "النهارده عندك 2 طلب جديد".
2. **Given** the chart shows 30 days, **When** the manager picks "7 أيام", **Then** the line, totals and x labels redraw for 7 days.

### User Story 2 - Process orders (Priority: P1)
The manager filters orders by status, searches by number or name, opens one, moves it through جديد → قيد التجهيز → خرج للتوصيل → تم التسليم, or cancels it, and prints the invoice.

**Independent Test**: On `admin/orders.html` select an order, press the advance button 3 times; the timeline fills and the status chip changes each time. Reload: the status is kept.

**Acceptance Scenarios**:
1. **Given** a "جديد" order, **When** "أكّد وابدأ التجهيز" is pressed, **Then** it becomes "قيد التجهيز" and a toast confirms.
2. **Given** a customer finished checkout on the storefront in the same browser, **When** the orders page opens, **Then** that order appears at the top marked "من الموقع الآن".
3. **When** "تصدير Excel" is pressed, **Then** a CSV of the visible orders downloads and opens correctly in Excel (UTF-8 BOM).

### User Story 3 - Manage products (Priority: P1)
The manager browses the same 20 products the storefront shows, filters by category, edits name/brand/category/price/old price/stock/description, toggles visibility and flash-sale, sees a live storefront-card preview, adds and deletes products.

**Independent Test**: On `admin/products.html` change a price; the preview card and discount badge update as you type; save; reload; the price is kept.

### User Story 4 - Edit the website content (CMS) (Priority: P2)
The manager edits homepage sections (announcement bar, hero, categories, flash, bridal, B2B, about, footer), reorders and hides them, previews desktop and mobile, sees the JSON payload, publishes, and restores an older version.

**Independent Test**: Edit the hero title; the live preview updates and "1 تعديل غير منشور" shows; publish; a new version appears in history; restoring v1 brings the old text back as a draft.

### User Story 5 - Customers and trader approvals (Priority: P2)
The manager reviews B2B trader registration requests, picks a credit limit, approves or rejects, and browses all customers with loyalty tiers.

### User Story 6 - Settings (Priority: P3)
Store info, delivery zones and prices (the same 4 zones as checkout), payment methods on/off, team roles, and brand palette with live preview.

### User Story 7 - Work fast (Priority: P2) — the special part
- **Command palette** (Ctrl/⌘+K or `/`): search orders, products, customers and pages from anywhere, jump or run actions ("طلب جديد"، "منتج جديد"، "الوضع الليلي").
- **Keyboard navigation**: `g` then `o/p/c/s/h/e` jumps to a page.
- **Dark mode** that follows the system and can be toggled, saved per browser.
- **Live storefront link**: the real checkout order (`localStorage.serag_order`) shows in the admin with a pulse.
- **Everything persists** across reloads, with "استرجاع البيانات التجريبية" to reset.

### Edge Cases
- Search with no results shows an empty state, not a blank table.
- Deleting the selected product selects the next one; deleting the last one shows an empty editor state.
- Price fields accept only digits; old price lower than price shows no discount badge.
- Storage unavailable (private mode): the admin still works in memory and says changes won't be kept.
- Phone width (375px): sidebar becomes a drawer, tables scroll inside their card.

## Requirements

### Functional Requirements
- **FR-001**: Admin MUST have 6 pages: نظرة عامة, محرر الموقع, الطلبات, المنتجات, العملاء والتجّار, الإعدادات, sharing one sidebar and header.
- **FR-002**: Sidebar badges MUST show live counts (new orders, pending traders).
- **FR-003**: Order status changes, product edits, CMS publishes, trader decisions and settings MUST persist in the browser.
- **FR-004**: Product seed MUST match `SERAG.catalog` in `config.js` (ids, names, brands, categories, prices).
- **FR-005**: Delivery zones seed MUST match `SERAG.zones` (المنصورة 100، مراكز الدقهلية 150، باقي الدلتا 250، باقي مصر 400).
- **FR-006**: All data access MUST go through `admin/assets/store.js`, named after future API endpoints.
- **FR-007**: Pages MUST be RTL, accessible, and usable at 375px.
- **FR-008**: Command palette, shortcuts, dark mode and toasts MUST work on every page.
- **FR-009**: Print invoice MUST print only the invoice, not the admin chrome.

### Key Entities
- **Order**: id (`SR-2026-0124`), customer, city, channel (أفراد/تجّار/جهاز عروسة), payment, status, items[{productId, name, qty, price}], shipping, createdAt, source (`seed`|`storefront`).
- **Product**: id, name, brand, cat, price, old, stock, active, flash, desc, cap, warranty.
- **TraderRequest**: id, company, type, city, cr, volume, status, limit.
- **Customer**: name, city, type, orders, spent, tier.
- **CmsContent**: sections{}, order[], hidden{}, versions[].
- **Settings**: store{}, zones[], payments{}, team[], palette.

## Success Criteria
- **SC-001**: Manager can confirm a new order in 2 clicks from the overview.
- **SC-002**: Any order, product or customer is reachable in under 3 seconds via the command palette.
- **SC-003**: No horizontal page scroll at 375px on any admin page.
- **SC-004**: No console errors on any page.

## Assumptions
- Single admin user for now; login is out of scope (BRD lists it for the backend phase).
- Revenue and customer figures are demo data until the backend exists; the UI labels them as such.
- The old `admin/` prototype (deleted in the working tree) is replaced, not merged.
