# Suggestions to discuss (after spec 012)

Ideas noticed while building the motion pass. Nothing here is implemented; each needs a yes first.

## Product story
1. **Pick the product from a list, not by typing its slug.** The dashboard field is a text box today
   (with a hint). A searchable product picker would remove typos; the section hides itself when the
   slug does not match a product, so a typo silently removes the section.
2. **Guess the appliance from the product's category** (fridges → fridge, washers → washer…) and only
   let the owner override it.
3. **More than one story.** A small carousel or a rotation per visit (one story per week, or one per
   season: ACs in summer, cookers before Ramadan).
4. **Real product photo inside the scene** as an option for products with a good cut-out photo.

## Reviews
5. **Ask for a review after delivery** (WhatsApp message with a link when the order is marked
   delivered). The new section only appears with at least 4 reviews, and it is the strongest trust
   signal on the page.
6. **Let the owner pin favourite reviews** for the home section instead of always showing the latest.

## Motion and polish
7. **Category page:** apply the same ink-fill headline and a light card stagger on filter changes.
8. **Product page gallery:** a zoom-on-hover lens and a swipe gesture on phones.
9. **Checkout success:** a short confetti in the brand colours (sand and green) instead of the burst.
10. **Sound:** none. Keep the site silent; noted only because Alive uses it.

## Dark mode
11. Native form controls (checkboxes, selects, scrollbars) now follow the dark theme via
    `color-scheme`. A full dark pass on the admin pages is still worth a separate review.
12. The faded state of ink-fill headline words is quite dim on the dark background; it fills in on
    scroll, but if it reads as "broken" we can raise it.

## Performance
13. GSAP loads on the first interaction to stay inside the Lighthouse script budget. If the budget
    is ever relaxed, the hero could animate on load without waiting for a scroll.
