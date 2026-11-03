# Feature Specification: Arabic headline font

**Feature Branch**: `013-client-feedback-round-1`

**Created**: 2026-11-03

**Status**: Draft

**Input**: User description: "The client dislikes the Thmanyah look in Arabic and wants something bolder that expresses the store. Change the Arabic headline font (Alexandria, Black/ExtraBold), keep the clean Thmanyah Sans for body text."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Arabic headlines feel bold and like a store (Priority: P1)

An Arabic-speaking shopper sees large, confident headlines (home hero, section titles, category and product titles) in a bold modern sans face instead of the editorial serif, while body text, prices and buttons stay in the clean existing face.

**Why this priority**: it is the client's explicit visual complaint.

**Independent Test**: open the home, a category, a product and the FAQ page in Arabic; every large heading uses the new face at heavy weight and none shows clipped ascenders/descenders or broken letter joins.

**Acceptance Scenarios**:

1. **Given** the Arabic home page, **When** it renders, **Then** the hero headline and section titles use the new bold face.
2. **Given** any heading with outlined or very large text, **When** it renders, **Then** letters stay joined (no letter-spacing) and lines are not clipped.
3. **Given** the English site, **When** it renders, **Then** English typography is unchanged.

---

### User Story 2 - Fonts do not slow the page (Priority: P1)

The new face loads without hurting first paint or layout stability on mobile.

**Why this priority**: the page-speed budgets are enforced in CI.

**Independent Test**: mobile Lighthouse on the four tracked pages stays within budgets; no visible layout jump when the font swaps in.

**Acceptance Scenarios**:

1. **Given** a cold mobile load, **When** the page paints, **Then** text is readable at once with system fonts and the headline face applies after first paint without a layout jump above 0.02.
2. **Given** the CI Lighthouse run, **When** it finishes, **Then** all assertions pass.

---

### Edge Cases

- Headline text mixing Arabic and Latin digits or brand names renders consistently.
- Dark mode headings keep contrast.
- If the font file fails to load, the fallback stack keeps headings readable and bold.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Arabic headline text MUST use a bold modern sans face (Alexandria Black/ExtraBold) across the storefront.
- **FR-002**: Body text, prices and form controls MUST keep their current face.
- **FR-003**: Headline spacing (line height, padding, tracking) MUST be re-tuned for the new face: no clipping, no letter-spacing on Arabic.
- **FR-004**: The font MUST be loaded without a new runtime dependency and without being requested before first paint.
- **FR-005**: English typography MUST NOT change.
- **FR-006**: The font MUST be licensed for self-hosting (open license).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a review of the home, a category and a product page in Arabic, the client confirms the headlines read as bolder and store-like.
- **SC-002**: Cumulative layout shift stays below 0.1 and mobile performance at or above 0.9 on the tracked pages.
- **SC-003**: Zero clipped or letter-spaced Arabic headlines on the reviewed pages.

## Assumptions

- Alexandria (open license) is the chosen face ("just pick the best"); the client may still ask to swap it, so the face is defined in one place.
- Thmanyah Sans stays for body text; its files remain outside git.
- Headline styles tuned for the previous display face are re-tuned, not duplicated.
