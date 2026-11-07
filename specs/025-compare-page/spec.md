# 025: Compare page that shows the differences

## Why
The owner finds `/compare` plain: a flat table of values side by side, so the shopper has to hunt for the differences. The page should make the differences and the better option obvious, in the store's "luxury magazine" style. The floating header also covers the product images when scrolling.

## Current state
- `pages/compare.vue` → `StoreCompareTable.vue` (290 lines), `StoreCompareEmpty.vue`, `useCompareTable.ts`, `utils/compare-table.ts` (`buildCompareTable` returns rows with `different`, `isMixed`, `hasDifferences`). A "show only differences" toggle already exists in the composable.

## Behaviour

### 1. Differences first
- The "show only differences" control is a clear switch above the table, on by default when at least one row differs.
- Rows that differ get a soft brand-tinted background and a brand-colour start border; identical rows are muted.
- A small count next to the switch: "5 فروقات من 9 مواصفات".

### 2. The better value in each row
- A "best" mark (small check badge + bold value) on the winning cell when there is a clear winner:
  - price: lowest (and on ties no mark);
  - warranty: most years (number parsed from the text; no mark if not parseable);
  - boolean specs: "yes" wins when the others are "no";
  - number specs: highest wins by default. The spec template field gets an optional `better: 'higher' | 'lower' | 'none'` (JSON column, no migration; admin spec-template editor gets a small select, default "higher" for number fields).
- Pure function `pickBestIndexes(row)` in `utils/compare-table.ts` with unit tests.

### 3. Summary above the table
- One or two editorial sentences built from the rows, e.g. "تورنيدو فيه شعلة زيادة وأعرض بـ 30 سم. فريش أرخص بـ 2,300 ج.م وفيه إشعال ذاتي." Rules: price difference first, then up to three biggest wins per product. Pure function with tests; i18n templates in both locales.

### 4. Reading the table
- Product header row (image, brand, name, price, add to cart, remove) is sticky under the floating site header while scrolling the specs; its top offset uses the header's real height so nothing is covered.
- Specs grouped under small headings: السعر والضمان، المقاسات، المميزات، أخرى (group by row type and spec field type; no new data).
- Yes/no as clear icons (green check / grey dash) with text for screen readers.
- Price-difference line under the more expensive product: "+2,300 ج.م".

### 5. Empty slot
- The dashed "add a product" box becomes a card with a search input limited to the same category, showing up to 4 suggestions (reuse the existing search endpoint); choosing one adds it to the compare list.

### 6. Mixed categories
- When products come from different categories (`isMixed`), show a notice and only the shared rows (price, brand, warranty, origin, specs with the same key).

### 7. Mobile (375 px)
- The label column stays fixed on the start side; product columns scroll horizontally with snap, two visible at a time. The sticky product header scrolls in sync.

## Out of scope
Saving comparisons, sharing links, printing.

## Acceptance
- Unit tests: best-value picking (each rule, ties, nulls), summary sentences (ar/en), grouping.
- Browser: 2 and 3 products, same and mixed categories, ar and en, light and dark, 1280 and 375 px; sticky header never hidden by the site header.
- Gates green.
