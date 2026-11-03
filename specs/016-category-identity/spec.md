# Feature Specification: Category identity and motion

**Feature Branch**: `013-client-feedback-round-1`

**Created**: 2026-11-03

**Status**: Draft

**Input**: User description: "The client cannot tell one category page from another; all look alike. Give every category its own identity (colour, big line illustration, short line) with motion, like the home page."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Each category page looks like its own place (Priority: P1)

A shopper opens any category and immediately feels where they are: a header band with the category's own colour, a large line illustration, its name and a short line, animated on entry. Two different categories are visually distinguishable at a glance.

**Why this priority**: the client's complaint; identity helps orientation.

**Independent Test**: open two category pages; a reviewer who sees only the header tells which is which.

**Acceptance Scenarios**:

1. **Given** a category page, **When** it loads, **Then** the header band shows the category colour, illustration, name and short line with a short entrance animation.
2. **Given** two different categories, **When** compared, **Then** their colour and illustration differ.
3. **Given** a category without a configured colour or illustration, **When** it loads, **Then** a sensible default identity is used.

---

### User Story 2 - Moving between categories feels distinct (Priority: P2)

The page transition between categories uses the destination category's colour, and the active category is highlighted in navigation.

**Why this priority**: reinforces identity with motion, as on the home page.

**Independent Test**: navigate from one category to another and see the coloured transition and highlighted nav item.

**Acceptance Scenarios**:

1. **Given** in-app navigation to a category, **When** the transition runs, **Then** it takes the category's colour.
2. **Given** a category page, **When** navigation renders, **Then** that category is highlighted.

---

### User Story 3 - The owner sets each category's identity (Priority: P2)

The owner chooses each category's colour, illustration and short line in the dashboard.

**Why this priority**: new categories (household sub-categories) need an identity without a developer.

**Independent Test**: change a colour and line in the dashboard and see it on the category page.

**Acceptance Scenarios**:

1. **Given** the admin category form, **When** the owner picks a colour, illustration and writes a short line, **Then** the storefront shows them.

---

### Edge Cases

- Reduced motion: identity stays, animation is replaced by a static state.
- Dark mode keeps contrast on the coloured band.
- Long category names and sub-categories fit on 320 px screens.
- Real product photos change the look of listings; identity must work with or without them.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each category page MUST show a header band with category colour, large line illustration, name and short line.
- **FR-002**: The header MUST animate on entry (illustration and text), respecting reduced motion.
- **FR-003**: Colour, illustration and short line MUST be configurable per category from the dashboard with safe defaults, in Arabic and English.
- **FR-004**: In-app category navigation MUST use the destination category's colour in the page transition.
- **FR-005**: The active category MUST be highlighted in navigation.
- **FR-006**: Colour choices MUST keep readable contrast in light and dark mode.
- **FR-007**: The change MUST NOT add noticeable weight to category pages (page-speed budgets hold) and MUST NOT change listing behaviour (filters, sorting, pagination).

### Key Entities

- **Category identity**: accent colour, illustration choice, short line (per language), attached to a category.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a blind check of category headers, reviewers identify the category correctly at least 9 times out of 10.
- **SC-002**: The owner sets a new category's identity in under 2 minutes.
- **SC-003**: Category pages keep mobile performance at or above 0.9 and layout shift below 0.1.
- **SC-004**: Contrast checks pass in light and dark mode for every category colour.

## Assumptions

- A fixed palette of brand-harmonious colours and a fixed set of line illustrations (fridge, washer, TV, AC, cooker, cookware, small appliances, default) are offered rather than free colour pickers.
- Product photos are expected to arrive later; listing cards are out of scope here.
- Product detail pages are not changed in this feature.
