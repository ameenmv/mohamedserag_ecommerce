# Feature Specification: FAQ page

**Feature Branch**: `013-client-feedback-round-1`

**Created**: 2026-11-03

**Status**: Draft

**Input**: User description: "A standard world-class FAQ: accordion where clicking a question opens the full answer, topic tabs and search, with a very premium design; the owner edits questions and answers from the dashboard."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A shopper finds an answer fast (Priority: P1)

A shopper opens the FAQ, sees questions grouped by topic (delivery and payment, warranty, returns, products, wholesale), taps a question, and the full answer opens smoothly; opening another closes the previous one. A search box filters questions as they type.

**Why this priority**: the page exists to cut questions to the shop's phone and WhatsApp.

**Independent Test**: on the FAQ page, switch topics, open a question, search a word, and reach a visible answer in under 10 seconds.

**Acceptance Scenarios**:

1. **Given** the FAQ page, **When** a question is activated by mouse, touch or keyboard, **Then** its full answer opens with a short smooth animation and the previous answer closes.
2. **Given** topic tabs, **When** one is chosen, **Then** only that topic's questions show.
3. **Given** the search box, **When** the shopper types, **Then** matching questions (question or answer text) show and a clear empty state appears if none match.
4. **Given** the bottom of the page, **When** the shopper still has a question, **Then** a "still have a question?" card offers WhatsApp and phone.

---

### User Story 2 - The owner manages questions from the dashboard (Priority: P1)

The owner adds, edits, reorders, hides and deletes FAQ entries (question, answer, topic) from the dashboard.

**Why this priority**: content changes without a developer.

**Independent Test**: add a question in the dashboard and see it on the storefront within a minute.

**Acceptance Scenarios**:

1. **Given** the admin FAQ screen, **When** the owner saves a new entry, **Then** it shows on the storefront in its topic.
2. **Given** a hidden entry, **When** a shopper opens the FAQ, **Then** it does not appear.
3. **Given** a draft starter set of about 15 questions for an appliance store, **When** the store first launches this page, **Then** they are present and editable.

---

### User Story 3 - The page is premium and search-friendly (Priority: P2)

The page looks premium (large bold headline, soft cards, thin gold lines, gentle motion) and gives search engines structured question-and-answer data.

**Why this priority**: client request for design quality; helps discovery.

**Independent Test**: visual review at mobile and desktop widths in Arabic and English; validate the structured data.

**Acceptance Scenarios**:

1. **Given** the page, **When** it renders at 375 px and 1280 px, **Then** it is fully usable without horizontal scroll, in RTL and LTR.
2. **Given** the page source, **When** validated, **Then** valid FAQ structured data matches the visible questions.
3. **Given** reduced-motion preference, **When** a question opens, **Then** it opens without animation.

---

### Edge Cases

- No entries yet: an explicit empty state with contact options.
- Very long answers and answers with links or lists render correctly inside the accordion.
- Search with Arabic letter variants (hamza, ta marbuta) still matches.
- Deep link to a question (anchor) opens it on load.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The FAQ MUST be a structured list of entries (question, answer, topic, order, visible) rather than free text.
- **FR-002**: The storefront FAQ MUST show an accordion where one answer is open at a time, usable by keyboard and screen readers.
- **FR-003**: Topic tabs and a search box MUST filter entries; search MUST normalise Arabic variants.
- **FR-004**: The owner MUST be able to create, edit, reorder, hide and delete entries in the dashboard, in Arabic and English.
- **FR-005**: A starter set of about 15 questions for an appliance store MUST be provided as editable content.
- **FR-006**: The page MUST include valid FAQ structured data for visible entries.
- **FR-007**: The page MUST include a "still have a question?" card with WhatsApp and phone from store settings.
- **FR-008**: The page MUST respect reduced motion, dark mode, RTL/LTR and the page-speed budgets.
- **FR-009**: The existing `/pages/faq` link and footer entry MUST keep working.

### Key Entities

- **FAQ entry**: question, answer (rich text, limited formatting), topic, order, visibility, per-language text.
- **FAQ topic**: a named group (delivery and payment, warranty, returns, products, wholesale), ordered.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A shopper finds and reads an answer in under 10 seconds from opening the page.
- **SC-002**: The owner adds a question and sees it live in under 2 minutes without a developer.
- **SC-003**: The client confirms the page looks premium at both mobile and desktop.
- **SC-004**: Structured data validates with zero errors; accessibility checks pass.

## Assumptions

- Starter questions are written in Arabic and English by the assistant from typical appliance-store policies (delivery, payment on delivery, warranty, returns, installation, wholesale) and reviewed with the client; policy facts are placeholders to confirm.
- The existing content-pages system keeps serving other pages; the FAQ becomes its own structured feature.
- Contact details come from existing store settings.
