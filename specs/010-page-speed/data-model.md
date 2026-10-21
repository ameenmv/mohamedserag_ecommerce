# Data model: Page speed

No database change. The feature works with two records kept in docs and CI artifacts.

## Page budget

| Field | Home | Category | Product | Checkout |
|---|---|---|---|---|
| URL measured | `/` | `/c/refrigerators` | `/p/fresh-cooker-4b-s15` | `/checkout` |
| Speed score (min) | 0.9 | 0.9 | 0.9 | 0.9 |
| Largest content time (max) | 2.5 s | 2.5 s | 2.5 s | 2.5 s |
| Layout shift (max) | 0.1 | 0.1 | 0.1 | 0.1 |
| Console errors | 0 | 0 | 0 | 0 |
| Accessibility score | 1 | 1 | 1 | 1 |
| Script size (max) | 200 KB | — | — | — |
| Level | error | error (after this feature) | error (after this feature) | error (after this feature) |

The source of truth is `lighthouserc.json`; see [contracts/lighthouse-budgets.md](contracts/lighthouse-budgets.md).

## Speed measurement

One row per page per measured version, kept in `docs/PHASE-1.md` (before and after):

| Field | Example |
|---|---|
| Page | category |
| Code version | commit hash |
| Where | CI (reference) or local |
| Speed score (median of 3) | 0.75 |
| Largest content time (median) | 3.2 s |
| Largest content element | `<p class="max-w-2xl …">` (category description) |
| Layout shift | 0.000 |
| Script transfer | 199 KB |
