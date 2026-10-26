# Launch checklist

> **باختصار:** دي كل الحاجات اللي محتاجة صاحب المحل قبل الإطلاق، ومكان كل واحدة. الكود جاهز؛ الناقص بيانات حقيقية وقرارات.

Everything that has to be decided or entered before the store goes live, where it is set, and its status. Items come from PRD §13 (open questions) plus the deploy steps. No code change is needed for any of them.

**Status:** ⬜ owner input needed · ✅ decided / done · 🔧 technical step (see [DEPLOY.md](DEPLOY.md))

## Store data (PRD §13)

| # | Item | Where it is set | Status |
|---|---|---|---|
| 1 | Working hours and showroom address (map link) | Admin «الإعدادات» → بيانات المعرض | ⬜ |
| 2a | Main WhatsApp / phone number | «الإعدادات» → بيانات المعرض | ⬜ |
| 2b | Traders WhatsApp number | «الإعدادات» → بيانات المعرض | ⬜ |
| 2c | InstaPay address, Vodafone Cash number | «الإعدادات» → طرق الدفع | ⬜ |
| 3 | Bridal tier contents and prices (أساسية / ذهبية / القصر) | Admin «جهاز العروسة» | ⬜ |
| 4 | Price threshold for «التقسيط متاح في المعرض» | Code constant `INSTALLMENT_MIN_PRICE_PIASTRES` in `apps/web/app/composables/useStoreSettings.ts` (now 10,000 ج.م); tell the developer the owner's number | ⬜ |
| 5 | Domain name | `SITE_ADDRESS`, `PUBLIC_URL` in `docker/.env` | ⬜ |
| 6 | Photos for the top 50 products (who and when) | Admin «المنتجات» → each product's gallery | ⬜ |
| 7 | Analytics tool | **Umami** (self-hosted, cookie-less), already wired | ✅ decided unless the owner objects |
| 8 | Cookie banner | **None**: no ad pixels and Umami sets no cookies | ✅ decided unless the owner objects |
| 9 | Fawry: how payments are received | Stays **off** in «الإعدادات» → طرق الدفع until answered | ⬜ |
| 10 | Cities / markaz per delivery zone and fees | «الإعدادات» → مناطق التوصيل | ⬜ |
| 11 | Returns policy wording reviewed by the lawyer | Admin «محرر الموقع» → الصفحات → سياسة الاسترجاع | ⬜ |

While any store number is still a placeholder, the admin overview shows a warning with the missing fields and a link to «الإعدادات», and the storefront hides phone and WhatsApp links instead of showing fake ones.

## Catalogue and content

| Item | Where | Status |
|---|---|---|
| Replace or archive the starter catalogue (seeded demo products) with the real products, prices and stock | Admin «المنتجات» (CSV import at «استيراد») | ⬜ |
| Home page sections, hero text and images | Admin «محرر الموقع» → الرئيسية | ⬜ |
| About, FAQ, delivery and warranty pages | Admin «محرر الموقع» → الصفحات | ⬜ |
| Large-COD deposit threshold and % (default 30,000 ج.م / 10%) | «الإعدادات» → عربون الدفع عند الاستلام | ✅ default set, owner may change |
| WhatsApp message templates | «الإعدادات» → قوالب الرسائل | ✅ defaults set, owner may edit |
| Trader videos on the home page («التجار بيتكلموا عننا»): six real Facebook reels are in; the owner can add, edit, reorder or remove them in the admin | Admin → Content → Home → Trader videos | ✅ |
| Thmanyah font (Arabic text and headlines): Thmanyah support allowed website use (ticket 359363) on condition the files cannot be downloaded or hotlinked. The files are not in git: before building, copy `thmanyahsans-Regular.woff2`, `thmanyahsans-Bold.woff2` and `thmanyahserifdisplay-Black.woff2` into `apps/web/server/assets/fonts/thmanyah/` on the build machine (without them the site falls back to IBM Plex Sans Arabic and Lalezar). The app serves them only to its own pages | `apps/web/server/routes/fonts/thmanyah/[file].get.ts` | ⬜ copy to the build machine |
| Home sections not yet editable in «محرر الموقع» («إزاي تطلب؟», «من المصنع لحد بيتك», «محتار تختار؟») and the about timeline/values: wording to review | `apps/web/i18n/locales/ar.json` → `store.home` (tell the developer) | ⬜ |
| Bridal builder «جهّز بيتك»: switched off for launch (pages, links, admin screen hidden) | `FEATURES.bridal` in `apps/web/app/constants/features.ts` | ✅ decided: off for now |

## Server and go-live

| Item | Where | Status |
|---|---|---|
| VPS with Docker, ports 80/443 | [DEPLOY.md §1](DEPLOY.md#1-server) | 🔧 |
| DNS record for the domain | Domain registrar | ⬜ |
| `docker/.env` with real secrets | [DEPLOY.md §2](DEPLOY.md#2-environment) | 🔧 |
| First deploy + seed, then change the admin password | [DEPLOY.md §3](DEPLOY.md#3-first-deploy) | 🔧 |
| Umami website id and new Umami password | [DEPLOY.md §4](DEPLOY.md#4-analytics-umami) | 🔧 |
| `SITE_INDEXABLE=true` on the real domain | `docker/.env` | 🔧 |
| First backup verified, backups copied off the server | [OPERATIONS.md §1–2](OPERATIONS.md#1-backups) | 🔧 |
| Uptime monitor on `/api/health` and `/healthz` | [OPERATIONS.md §5](OPERATIONS.md#5-health-checks-for-an-uptime-monitor) | 🔧 |
| Sitemap in Google Search Console, feed in Merchant Center | [DEPLOY.md §7](DEPLOY.md#7-after-going-live) | 🔧 |
| Place one real test order of each payment method and confirm it from the WhatsApp link | Storefront + `/admin/confirm/:token` | ⬜ |
