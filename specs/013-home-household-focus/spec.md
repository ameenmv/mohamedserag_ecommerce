# Feature Specification: Home refocus on household goods, fewer traders

**Feature Branch**: `013-client-feedback-round-1`

**Created**: 2026-11-03

**Status**: Draft

**Input**: User description: "Home refocus on household goods and fewer traders (client meeting 2026-11-02): homeware ("منزلي") gets real prominence for regular customers; wholesale/traders is de-emphasised."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A regular shopper sees that the store sells household goods (Priority: P1)

A shopper opens the home page and, within the first screen, understands that the store sells household goods (cookware and small appliances) as much as large appliances. A "منزلي" card appears in the hero beside fridges, washers and ACs, "منزلي" is among the first featured categories, and it appears in the main navigation.

**Why this priority**: it is the client's main request; the store sells more household goods than the home page suggests.

**Independent Test**: open the home page in Arabic and English; the hero shows a "منزلي" card, the featured categories list shows it early, the navigation links to it, and following any of them opens the household category with its products.

**Acceptance Scenarios**:

1. **Given** the home page, **When** it loads, **Then** the hero art shows four cards: fridges, washers, ACs and household goods (the household card takes the place of the screens card).
2. **Given** the splash plays, **When** the cards land, **Then** each splash card lands exactly on its hero card, including the household card.
3. **Given** the featured categories on the home page, **When** they render, **Then** household goods appear among the first items and screens remain reachable.
4. **Given** the main navigation, **When** it renders, **Then** a "منزلي" entry leads to the household category page.

---

### User Story 2 - The owner manages household sub-categories from the dashboard (Priority: P1)

The owner creates and edits the household category and its sub-categories (for example kitchen tools and cookware, small appliances such as mixers, kettles, air fryers, irons) from the admin dashboard, without a developer, and products can be assigned to them.

**Why this priority**: the catalogue will grow; the client must manage it alone.

**Independent Test**: in the dashboard add a sub-category under "منزلي", assign a product, and see both on the storefront.

**Acceptance Scenarios**:

1. **Given** the admin categories screen, **When** the owner adds a sub-category under "منزلي", **Then** it appears in the storefront navigation and the household page.
2. **Given** a product, **When** the owner assigns it to a household sub-category, **Then** it shows on that sub-category's listing.
3. **Given** an empty household sub-category, **When** a shopper opens it, **Then** an explicit empty state is shown (not a blank page).

---

### User Story 3 - Traders no longer dominate the home page (Priority: P2)

Regular customers see one clear traders entry point, not five. The hero's second button "أسعار الجملة للتجار" is gone; one traders section remains on the home page; the main navigation has a single "للتجار" link; traders' reviews live on the traders page.

**Why this priority**: the home page is for regular customers; wholesale must stay reachable but not prominent.

**Independent Test**: count traders entry points on the home page (one section, one navigation link, no hero button); the traders page shows the traders' reviews.

**Acceptance Scenarios**:

1. **Given** the home hero, **When** it renders, **Then** only the primary "تسوّق دلوقتي" call to action is shown.
2. **Given** the main navigation, **When** it renders, **Then** exactly one traders link exists.
3. **Given** the home page, **When** scrolling, **Then** exactly one traders section appears and no traders-reviews section.
4. **Given** the traders page, **When** it loads, **Then** the traders' reviews are shown there.

---

### Edge Cases

- A visitor with an old saved home layout (the owner customised sections): the removed traders-reviews section must not break rendering, and the household category must appear without manual action.
- The household category has no products yet: its hero card and links still work and show an empty state.
- Small phones: the hero art is below the first screen, so the splash keeps its existing drop-away ending.
- Reduced-motion and English (LTR) visitors get the same content in the mirrored layout.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The home hero MUST show a household-goods card in place of the screens card, with the same size, tilt and style rules as the other cards.
- **FR-002**: The splash cards MUST include the same household card and MUST still land exactly on the hero cards.
- **FR-003**: A top-level household category ("منزلي" / "Household") MUST exist, with the existing cookware and kitchen-tool products reachable under it.
- **FR-004**: Household sub-categories MUST be creatable, editable and orderable from the admin dashboard, and products MUST be assignable to them.
- **FR-005**: The featured-categories section MUST list household goods among its first items; screens MUST stay reachable from navigation, search and the all-categories menu.
- **FR-006**: The main navigation MUST include a household entry.
- **FR-007**: The hero's secondary button "أسعار الجملة للتجار" MUST be removed.
- **FR-008**: The home page MUST contain exactly one traders section and MUST NOT contain a traders-reviews section; the traders reviews MUST appear on the traders page.
- **FR-009**: The main navigation MUST contain a single traders link.
- **FR-010**: All new strings MUST exist in both Arabic and English; the existing home-page behaviours (page transitions, cursor, product story, reviews, SEO, CSP) MUST keep working.
- **FR-011**: The home page first-load script size MUST stay within the existing page-speed budget.

### Key Entities

- **Category**: a store category with a name, slug, optional parent, order and visibility; the household category is a top-level one with sub-categories.
- **Home content sections**: the owner-managed list of home sections; the traders-reviews section is removed from it, and the featured-categories list gains household goods.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a first-time visit, a shopper can name "household goods" as something the store sells after viewing only the first screen of the home page.
- **SC-002**: The home page has one traders entry point on the page plus one in the navigation (down from five).
- **SC-003**: The owner can add a household sub-category and assign a product to it, visible on the storefront, in under 3 minutes without a developer.
- **SC-004**: The splash cards land on the four hero cards with no visible offset (under 2 px horizontally).
- **SC-005**: Mobile Lighthouse for the home page stays at or above the current budgets (performance, LCP, CLS, script size).

## Assumptions

- The household category is a new top-level category; existing "أدوات مطبخ تركي" (cookware) and cookers are shown under it as sub-categories or remain visible alongside it (decided in planning without breaking existing URLs).
- Screens are not removed from the store, only from the hero card slot.
- The owner will enter the new household products and sub-categories; this feature provides the structure, labels and empty states, and seed examples for demonstration.
- The traders page already exists (`/traders`); only its content grows.
- Admin category management already exists; sub-category depth needed is two levels.
