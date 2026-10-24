# Feature Specification: Page speed

**Feature Branch**: `010-page-speed`
**Created**: 2026-10-21
**Status**: Draft
**Input**: Follow-up to spec 009, task T010. The category, product and checkout pages must meet the PRD §7 mobile budgets that the home page already meets, and the automated speed check must then block a change that breaks them.

## Overview

Most shoppers reach the store on a phone, often on a slow mobile connection, and usually land on a category or a product page from search or a shared link — not on the home page. Today those pages show their main text about 3 seconds after the link is opened on a mid-range phone over a slow connection, against a target of 2.5 seconds. The home page already meets the target.

Measurements from spec 009 show where the time goes: the largest piece of content is text on every page, and the first paint is held back by the page's styling and text layout rather than by its scripts (the same page with scripts removed paints just as late; with styling removed it paints almost immediately). Making product cards and reviews wake up only when scrolled to was tried and undone, because taps made before they woke up were lost.

This feature makes the three pages fast without changing how they look or behave, and turns the speed check for them from a warning into a gate.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — A category page opens fast on a phone (Priority: P1)

A shopper taps a link to «ثلاجات وفريزر» on a mid-range phone over a slow mobile connection. The heading, the description and the first row of products appear quickly, and the page reacts to taps right away.

**Why this priority**: Category pages are the main landing pages from search and ads; a slow first view loses the visit before any product is seen.

**Independent Test**: Run the automated mobile speed check on a category page with the seeded catalogue through the production proxy; it meets every budget in three runs out of three (median).

**Acceptance Scenarios**:

1. **Given** a category page with at least 20 products, **When** it is opened on the simulated mid-range phone and slow connection, **Then** its largest content is shown in under 2.5 seconds and the overall speed score is at least 90 out of 100.
2. **Given** the page has loaded, **When** the shopper taps a filter, a sort option, «أضف للسلة», «قارن» or the wishlist heart, **Then** the action works on the first tap (no lost taps).
3. **Given** the page is loading, **Then** nothing on screen jumps as images and fonts arrive (layout shift below 0.1).

---

### User Story 2 — A product page opens fast on a phone (Priority: P1)

A shopper opens a product shared on WhatsApp. The name, price and buy button appear quickly; the gallery, specs, reviews and related products follow without blocking them.

**Why this priority**: Shared product links are the store's main word-of-mouth channel; the price and «أضف للسلة» must be visible and usable at once.

**Independent Test**: Same automated check on a product page with images, specs, reviews and related products.

**Acceptance Scenarios**:

1. **Given** a product page with a gallery, specs, reviews and related products, **When** opened on the simulated phone and connection, **Then** its largest content shows in under 2.5 seconds and the speed score is at least 90.
2. **Given** the page has loaded, **When** the shopper adds to cart, opens the gallery, writes a review or taps a related product's buttons, **Then** each works on the first tap.
3. **Given** the sticky buy bar and the gallery, **Then** they do not shift the layout as they appear.

---

### User Story 3 — Checkout opens fast on a phone (Priority: P1)

A shopper with items in the cart opens checkout. The form and the order total appear quickly and the fields can be filled straight away.

**Why this priority**: A slow checkout costs orders that were already won.

**Independent Test**: Same automated check on the checkout page.

**Acceptance Scenarios**:

1. **Given** the checkout page, **When** opened on the simulated phone and connection, **Then** its largest content shows in under 2.5 seconds and the speed score is at least 90.
2. **Given** checkout has loaded, **When** the shopper fills the form and places a cash-on-delivery order, **Then** the order goes through exactly as before.

---

### User Story 4 — A slower page can no longer be merged (Priority: P2)

The developer changes a page. If the change pushes the home, category, product or checkout page over a budget, the automated checks on the change fail and say which page and which budget.

**Why this priority**: Without a gate, speed slowly regresses after launch; it protects the work in stories 1–3.

**Independent Test**: The automated checks on a pull request run the speed check on the four pages and fail when any budget is missed.

**Acceptance Scenarios**:

1. **Given** the four pages meet their budgets, **When** the automated checks run, **Then** they pass with every speed assertion set to fail (not warn).
2. **Given** a change that makes one page miss a budget, **When** the checks run, **Then** they fail and the report names the page and the budget.

### Edge Cases

- A category with no products, or a filter with no results: the empty state must also meet the budgets.
- A product without images, specs or reviews: the page must not get slower or shift because something is missing.
- English pages (`/en/...`, left to right): same budgets, same look in the English typeface.
- Very long Arabic product names and descriptions: no extra wrapping cost that pushes the main content late; text stays readable and is never cut.
- Flash-sale countdown and price badges on cards: still update live, without layout shift.
- A shopper who taps before the page has finished waking up: the tap still works (the regression found in spec 009 must not come back).
- Shoppers with reduced-motion settings, dark mode or zoomed text: the page stays usable and within budget.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: On the simulated mid-range phone (375 px wide) over a slow mobile connection, measured through the production proxy, the category, product and checkout pages MUST each reach a speed score of at least 90, show their largest content in under 2.5 seconds, keep layout shift below 0.1 and log no errors — the same budgets as the home page.
- **FR-002**: The home page MUST keep meeting its budgets, including its script-size budget, after this work.
- **FR-003**: Every storefront behaviour MUST stay as it is: filters, sorting, pagination, search, add to cart, compare, wishlist, gallery, reviews, notify-me, bridal buttons, checkout and the order confirmation. Every interactive control MUST respond to the first tap once it is visible.
- **FR-004**: The pages MUST look the same as before: brand colours, Arabic and English typefaces, right-to-left layout, spacing and dark mode. Any change visible to a shopper (for example, a heading drawn briefly in a fallback typeface) MUST be judged acceptable in a side-by-side review before it ships.
- **FR-005**: The security policy added in spec 009 MUST stay as strict as it is: no new allowances for inline scripts or code evaluation, and the existing security browser test MUST keep passing with zero violations.
- **FR-006**: Accessibility MUST not regress: the automated accessibility scan stays at zero serious or critical issues and the speed check's accessibility score stays at 100.
- **FR-007**: No new third-party code may be shipped to shoppers' browsers to achieve this.
- **FR-008**: The automated checks on every pull request MUST run the speed check on home, a category, a product and checkout with every budget set to fail the run, replacing today's warnings for the three pages.
- **FR-009**: The before and after measurements (score, largest content time, what the largest content is, script size) for the four pages MUST be recorded with the work, so the next change can be compared against them.

### Key Entities

- **Page budget**: for one page — minimum speed score, maximum time to show the largest content, maximum layout shift, no logged errors, and (home only) maximum script size.
- **Speed measurement**: one run of the automated check on one page — score, largest content time and element, layout shift, script size, and the date and code version it was taken on.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On the simulated mid-range phone and slow connection, the median of three runs shows the main content of the category, product and checkout pages in under 2.5 seconds (from about 3.1–3.3 seconds today).
- **SC-002**: All four pages score at least 90 out of 100 for speed and 100 for accessibility, with layout shift below 0.1 and zero logged errors, in the automated checks on the pull request.
- **SC-003**: Every speed budget on the four pages is enforced: a pull request that misses one fails.
- **SC-004**: The full browser test suite (including the security and accessibility tests and the phone-width runs at 375 and 320 px) passes with no test removed or weakened.
- **SC-005**: A side-by-side comparison of the four pages before and after, in Arabic and English and at 375 px and desktop width, shows no visible difference the owner would object to.

## Assumptions

- The budgets and the simulated device and connection are the ones in PRD §7 and already used for the home page (mobile, 375 px, Lighthouse's default slow-4G simulation, median of three runs); the CI measurement is the reference, local numbers are only a guide because they vary with machine load.
- The pages are measured with the seeded catalogue (the same category, product and checkout URLs as spec 009), not with the owner's real catalogue, which may have more images.
- Server response time is not the bottleneck (measured at well under 0.3 seconds through the proxy); the work is in what the browser has to do before it can paint.
- Reducing what is styled, laid out or loaded before the first paint is acceptable as long as the end result looks the same; a brief swap from a fallback typeface to the brand typeface is acceptable if it does not shift the layout.
- Later Phase 2 features are out of scope; this spec only covers speed on the four existing pages and the gate that protects it.
