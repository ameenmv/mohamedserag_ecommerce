# Phase 3: admin control and best seller

- `productStory.finish` (steel|white|black|champagne): the default 3D finish; the visitor can still switch with the swatches.
- `productStory.productMode` ('manual' | 'bestseller'): manual keeps `productSlug`; bestseller shows the most popular visible product of the category that matches the appliance kind (fridge→refrigerators, washer→washers, cooker→cookers, tv→tvs, ac→acs), falling back to `productSlug` when that category is empty.
- Admin dashboard: two new fields in the product-story section form (select for finish, select for product mode); the product slug hint explains it is used in manual mode.
- Old saved content without these fields reads as finish 'steel'/'tv'→'black'/'ac'→'white' defaults (keep the current per-kind defaults) and productMode 'manual'.
