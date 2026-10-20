# Feature Specification: Slice 5 — Reviews

**Feature Branch**: `006-reviews`

**Created**: 2026-10-19

**Status**: Draft

**Input**: User description: "Slice 5 — Reviews (PRD reviews epic, umbrella T060–T063): shoppers submit product reviews (rating 1–5, text, name, phone) with rate limit, honeypot, one review per phone per product; verified-buyer badge when the phone has a delivered order containing the product; reviews unpublished until approved; storefront review list and rating summary on product pages and cards; admin moderation queue (approve, reject, unpublish) gated by reviews.moderate; funnel event without personal data."

Product source of truth: [docs/PRD.md](../../docs/PRD.md) (E9 US-9.1/9.2, E12 US-12.7, §9 security, §11 data model `Review`). Builds on [003-slice2-checkout](../003-slice2-checkout/spec.md) (orders, delivered status, normalized phones) and [005-promotions-alerts](../005-promotions-alerts/spec.md) (public form pattern: honeypot, throttle, one entry per product + phone; admin queue + permission pattern).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Shopper writes a review (Priority: P1)

On a product page the shopper taps «اكتب تقييمك», gives 1–5 stars, writes a short opinion, and enters their name and mobile. The mobile is never shown to anyone except the admin. After sending they see «شكراً! تقييمك هيظهر بعد المراجعة». Nothing appears publicly until the store approves it.

**Why this priority**: Reviews are the social proof the PRD asks for; without submissions nothing else in this slice has content.

**Independent Test**: Open a product → write a 4-star review with 25 characters of text, name and «٠١٠١٢٣٤٥٦٧٨» → see the thank-you message → the product page still shows no new review → the same phone tries again on the same product → it is told it already reviewed this product.

**Acceptance Scenarios**:

1. **Given** a visible product, **When** the shopper submits stars 1–5, text of 20–1000 characters, a name of 2–60 characters and a valid Egyptian mobile (Arabic digits allowed), **Then** one pending review is stored with the normalized phone and they see «شكراً! تقييمك هيظهر بعد المراجعة».
2. **Given** the form, **When** stars are missing, text is shorter than 20 or longer than 1000 characters, or the phone is invalid, **Then** the form shows the reason next to the field and nothing is sent.
3. **Given** a phone that already reviewed this product (pending, approved or rejected), **When** it submits again, **Then** it is refused with «انت قيّمت المنتج ده قبل كده» and the existing review is unchanged.
4. **Given** spam, **When** the form is submitted too often from one address, **Then** it is throttled with a friendly message; **When** the hidden honeypot field is filled, **Then** the request is accepted silently and nothing is stored.
5. **Given** a hidden or archived product, **When** a review is submitted for it, **Then** it is refused as not found.
6. **Given** a review is submitted, **Then** the storefront sends `review_submitted` with only the product id and the star count (no name, phone or text).

---

### User Story 2 - Admin moderates reviews (Priority: P1)

The admin opens «التقييمات», sees pending reviews oldest first with product, stars, text, name, phone and a «اشترى من المعرض» tag where it applies, and approves or rejects each one. They can also add a short public reply from the store, unpublish an approved review later, or delete a review.

**Why this priority**: The PRD makes every review pending until approved; without moderation no review can ever be shown.

**Independent Test**: Submit a review → the admin sees it in the pending tab with its phone → approves it with a reply → it appears on the product page with the reply → the admin unpublishes it → it disappears from the product page and the average updates → the admin deletes a rejected review → it is gone from every tab.

**Acceptance Scenarios**:

1. **Given** pending reviews, **When** the admin opens the queue, **Then** they see them oldest first with product name (linking to the product), stars, text, reviewer name, phone, date and the verified-buyer tag, and a count of pending reviews.
2. **Given** a pending review, **When** the admin approves it, **Then** it becomes public on the product page and counts toward the product's average; **When** they reject it, **Then** it stays hidden and does not count.
3. **Given** an approved review, **When** the admin unpublishes it, **Then** it disappears from the storefront and the average and count update immediately; it remains visible to the admin under «مرفوض/مخفي».
4. **Given** any review, **When** the admin adds or edits a public reply (up to 500 characters) or clears it, **Then** the reply shows under the review on the storefront only while the review is approved.
5. **Given** any review, **When** the admin deletes it, **Then** it is removed permanently after a confirmation dialog (never a native browser popup), and the same phone may review that product again.
6. **Given** an admin without `reviews.moderate`, **When** they open the page or call its actions, **Then** they are refused and the sidebar entry is hidden.
7. **Given** the queue, **Then** the admin can switch between pending / approved / rejected, filter by product name and by stars, and page through results.

---

### User Story 3 - Shopper reads reviews and ratings (Priority: P1)

Shoppers see a product's average rating and number of reviews on product cards and the product page, a star breakdown, and the list of approved reviews newest first, each with stars, name, date, the store's reply if any, and «اشترى من المعرض» when the reviewer bought the product from the store.

**Why this priority**: Approved reviews only create value when shoppers can see them where they decide.

**Independent Test**: Approve three reviews (5, 4 and 3 stars, one from a buyer) → the card and product page show 4.0 and «3 تقييمات» → the list shows all three newest first with the buyer tag on one → a product with no approved reviews shows «لسه مفيش تقييمات — كن أول واحد يقيّم» and no stars on its card.

**Acceptance Scenarios**:

1. **Given** approved reviews, **Then** the product page shows the average rounded to one decimal, the count, and how many reviews each star level has; cards show the average stars and count.
2. **Given** pending or rejected reviews, **Then** they never appear and never count anywhere on the storefront.
3. **Given** more than 10 approved reviews, **When** the shopper reaches the end of the list, **Then** they can load more (10 at a time).
4. **Given** a review whose phone has a delivered order containing this product, **Then** it shows «اشترى من المعرض»; otherwise it does not.
5. **Given** a product with no approved reviews, **Then** the page shows an empty state inviting the first review and cards show no rating.
6. **Given** a product with approved reviews, **Then** search engines receive the product's aggregate rating from approved reviews only.
7. **Given** a public review, **Then** the reviewer's phone is never shown or sent to the storefront, and the name is shown as entered.

---

### Edge Cases

- A phone reviews a product, then later gets that product delivered: the verified-buyer tag is re-checked when the admin approves the review, so it can turn on at approval time.
- An order containing the product is later cancelled or returned: a tag already set stays as it was at approval time (it is not recomputed after approval).
- A product is archived or hidden: its reviews stay stored but nothing is shown publicly; the admin queue still lists them.
- A review deleted by the admin frees the phone to review the same product again.
- Text with links, HTML or only whitespace: stored as plain text and shown escaped; whitespace-only text fails the 20-character minimum after trimming.
- Very long names or words: wrap on narrow screens without breaking the 320 px layout.
- The same admin action clicked twice (double approve): the second action is a no-op, not an error.
- A product with exactly one approved review shows «تقييم واحد» rather than a plural.

## Requirements *(mandatory)*

### Submission

- **FR-001**: Any shopper MUST be able to submit a review on a visible, non-archived product with stars (1–5), text (20–1000 characters after trimming), name (2–60 characters) and an Egyptian mobile (normalized; Arabic digits allowed).
- **FR-002**: The system MUST allow at most one review per (product, normalized phone), whatever its status, and refuse repeats with a clear message.
- **FR-003**: Review submission MUST be rate-limited per client address and protected by a honeypot field that silently discards bot submissions.
- **FR-004**: Every new review MUST start as pending and MUST NOT be visible or counted on the storefront.
- **FR-005**: The verified-buyer flag MUST be computed from whether the review's phone has an order with status delivered containing that product; it MUST be computed at submission and re-checked at approval.

### Moderation

- **FR-006**: Admins with `reviews.moderate` MUST see reviews by status (pending / approved / rejected) with product, stars, text, name, phone, date and verified flag; pending oldest first, others newest first; filter by product name and stars; paginated.
- **FR-007**: Admins MUST be able to approve, reject, unpublish (approved → rejected), set or clear a public reply (≤ 500 characters), and delete a review; all actions MUST be permission-checked, CSRF-protected and audited.
- **FR-008**: Approving or unpublishing MUST update the product's public average and count immediately.
- **FR-009**: The admin dashboard and sidebar MUST show the number of pending reviews.

### Display

- **FR-010**: Product pages MUST show the average (one decimal), count, star distribution and approved reviews newest first, 10 per page with "load more"; each review shows stars, name, date, store reply and the verified tag.
- **FR-011**: Product cards (listings, search, offers, related products) MUST show average stars and count when the product has at least one approved review.
- **FR-012**: Product structured data MUST include an aggregate rating computed from approved reviews only, and only when at least one exists.
- **FR-013**: The storefront MUST never receive reviewer phones; review text and names MUST be rendered as plain text.

### Analytics & language

- **FR-014**: The storefront MUST send `review_submitted` with only product id and stars.
- **FR-015**: All shopper and admin text MUST exist in Arabic (primary, RTL) and English, and every screen MUST work at 320 px wide.

### Key Entities

- **Review**: product, reviewer name, normalized phone (private), stars 1–5, text, status (pending / approved / rejected), optional store reply, verified-buyer flag, client address (for abuse checks), created and updated times. One per product + phone.
- **Product rating summary**: per product, the count of approved reviews, their average stars and the count per star level; derived from approved reviews only.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A shopper can write and send a review in under 60 seconds from opening the product page.
- **SC-002**: 100% of reviews shown publicly have been approved by an admin; pending and rejected reviews never appear in any storefront view or in search-engine data.
- **SC-003**: The admin can moderate a pending review (open queue → decide) in under 15 seconds, supporting the PRD target of moderation within 24 hours.
- **SC-004**: After an approve or unpublish, the product's public average and count reflect the change on the next page view.
- **SC-005**: A second review from the same phone on the same product is refused 100% of the time, and bursts beyond the rate limit from one address are blocked.
- **SC-006**: No reviewer phone number appears in any storefront page, public response or analytics event.
- **SC-007**: All review screens work in Arabic and English at 320 px with no horizontal scrolling.

## Assumptions

- "Unpublish" moves an approved review to rejected (hidden from the storefront, kept for the admin); there is no separate "unpublished" status, matching the existing data model.
- Reviews are open to anyone (no customer accounts in Phase 1), as the PRD states; the verified tag is the trust signal.
- The verified tag is not recomputed after approval (cancellations or returns later do not remove it).
- Rate limit default: 3 review submissions per minute per client address; the per-phone-per-product rule covers longer-term abuse.
- Rejected reviews still block the same phone from reviewing that product again (only deletion frees it), so rejected spammers cannot simply retry.
- Reviews are only text and stars in Phase 1; photos, helpful votes, and review editing by the shopper are out of scope.
- Admin notification of new reviews is via the dashboard pending counter only (no WhatsApp/email alert in this slice).
- The `reviews.moderate` permission and the reviews table already exist from the foundation slice; no new data storage concepts are introduced.
