# Product Requirements Document — Mohamed Serag Online Store

| | |
|---|---|
| **Product** | محمد سراج للأجهزة المنزلية — online store + admin |
| **Owner** | Mohamed Serag store management (Mansoura, since 1972) |
| **Version** | 1.1 — replaces `BRD.md`; revised after Gemini 4 Argon review (see §15) |
| **Date** | 2026-10-16 |
| **Status** | Agreed in a grilling session with the product owner; ready for planning |
| **Related** | Admin prototype `admin/`, storefront prototype `*.html`, spec `specs/001-admin-dashboard/` |

---

## ملخص للإدارة (Arabic summary)

**الهدف:** نقل خبرة وثقة معرض محمد سراج (من 1972) للأونلاين، بموقع بيبيع الأجهزة المنزلية وأدوات المطبخ التركي المستوردة لكل مصر، ولوحة تحكم يدير منها المدير كل حاجة.

**الميزة اللي بتميزنا:** «جهّز بيتك» — منشئ جهاز العروسة. العروسة تختار باقة جاهزة (أساسية / ذهبية / القصر)، تعدّلها أوضة أوضة، تشاركها مع أهلها على واتساب، وتحجزها بعربون (10% افتراضياً) يثبّت أسعار الأجهزة ومصاريف التوصيل 30 يوم (الاتنين بيتغيروا من لوحة التحكم). البضاعة بتتحجز من المخزن لما نتفق على ميعاد التوصيل. التقسيط متاح في المعرض.

**في الإطلاق (المرحلة الأولى):**
- كتالوج أجهزة + أدوات مطبخ تركي، بحث ذكي وفلاتر، مقارنة لحد 3 أجهزة، المفضلة، واختبار «ساعدني أختار» للثلاجات والغسالات والشاشات والتكييفات.
- شراء من غير تسجيل حساب، والدفع: كاش عند الاستلام، أو إنستا باي / فودافون كاش (وفوري لو اتأكدت طريقته) مع إرسال إثبات التحويل على واتساب، والمدير يأكد بلمسة واحدة من لينك. الطلبات الكاش اللي فوق 30,000 ج.م بتحتاج عربون 10% بالتحويل قبل التوصيل (الرقمين بيتغيروا من لوحة التحكم).
- الكوبونات مش بتتجمع مع الخصومات وعروض الفلاش. والأسعار كلها مكتوب عليها «شاملة ضريبة القيمة المضافة».
- الشحن بعربيات المعرض (داخلياً)، والموقع بيحسب مصاريف المنطقة بس. لو العميل عايز يوم معيّن يكلمنا على واتساب.
- عروض فلاش بعداد، سعر قبل الخصم، وكوبونات خصم.
- تقييمات مفتوحة للكل بس مش بتظهر غير بعد موافقة المدير.
- قسم للتجار بزرار واتساب بس.
- لوحة تحكم: الطلبات (ومعاها حجوزات العرايس)، المنتجات، محرر الموقع والصفحات، التقييمات، الكوبونات والفلاش، والتقارير. مستخدم أدمن واحد دلوقتي والكود جاهز للصلاحيات.
- صفحات للأقسام والماركات لجوجل، مدونة أدلة الشراء، وظهور المنتجات في Google Shopping.

**المرحلة التانية:** حسابات العملاء، نقاط الولاء، تطبيق قابل للتثبيت (PWA)، أزرار تأكيد جوه واتساب، والفاتورة الإلكترونية لمصلحة الضرائب.

**التقنية:** Nuxt 4 + NestJS + PostgreSQL (Prisma) + Tailwind و shadcn-vue، في مستودع واحد (monorepo) على سيرفر VPS بـ Docker.

---

## 1. Vision and problem

### 1.1 Vision
The trusted Mansoura showroom, online. A family anywhere in Egypt can furnish a home — from one fridge to a full bridal package — with the same honest prices, real warranty and personal follow-up they would get from Mohamed Serag in person.

### 1.2 Problem
- Sales depend on people visiting the Mansoura showroom; the store's 54-year reputation does not reach buyers who search online.
- The biggest purchase decision in this market — a bride's full appliance package — is today a long series of showroom visits and phone calls, with prices that move every few weeks.
- The Turkish cookware the store imports directly (TAÇ, Glore, Yonca, Öztef Döküm, Marti, Edessa) is invisible outside the showroom.
- The current site is a static prototype: the cart is not connected to checkout (checkout always shows 75,300 ج.م), there are no product photos, and nothing reaches the store.

### 1.3 Goals (launch + 6 months)
| Goal | Measure |
|---|---|
| Sell online across Egypt | E-commerce conversion rate > 2.8% |
| Win bridal packages online | ≥ 30 bridal reservations per month |
| Make buying fast | Median checkout completion < 90 seconds |
| Keep visitors engaged | Bounce rate < 38% |
| Build repeat business | ≥ 20% of orders from returning customers (by phone number) |

### 1.4 Non-goals for launch
- Online card payments and online installments (installments are arranged in the showroom).
- Customer accounts and login.
- Online trader ordering, trader registration or trade prices.
- Delivery dispatch, driver assignment or courier integration — the owner runs delivery internally.
- Public order-tracking page, showroom pickup booking, online return requests, customer-downloadable invoices.
- Ad pixels (Meta, TikTok).

---

## 2. Personas

| Persona | Who | Needs | Success looks like |
|---|---|---|---|
| **The bride and her family** (العروسة وأهلها) | 22–30, planning a wedding 3–12 months out; the mother or father often pays | See the whole package and total in one place, compare tiers, protect against price jumps, share with family, pay in installments | Reserves a package online, family agrees on WhatsApp, deposit paid, prices locked |
| **The household buyer** (المستهلك) | Any adult in Egypt replacing or adding an appliance | Find the right model fast, trust the warranty, know the delivery cost, pay cash on delivery | Orders in under 90 seconds from the product page |
| **The cookware shopper** | Home cooks, gift buyers | Real imported Turkish brands at fair prices | Buys sets and pieces not found elsewhere |
| **The trader** (التاجر) | Shop owners in Delta governorates | Talk to the sales team quickly | Reaches sales on WhatsApp in one tap |
| **The store admin** (مدير المتجر) | Store manager, one person at launch | See what needs action today, confirm payments from the phone, update prices and content without a developer | Clears new orders and deposits from WhatsApp in seconds |

---

## 3. Decisions log (from the grilling session)

| Area | Decision |
|---|---|
| Signature feature | Bridal package builder |
| Launch audience | Retail + brides; traders via WhatsApp only |
| Catalog | Appliances + Turkish cookware |
| Product content | Manufacturer photos/specs for all; real photos for top ~50 sellers; spec template per category |
| Discovery | Smart search + filters, compare up to 3, wishlist, "Help me choose" quiz (fridges, washers, TVs, ACs) |
| Out of stock | "Notify me" (WhatsApp, sent by admin) + admin can mark "available on request 3–7 days" |
| Bridal start | Tier template (أساسية / ذهبية / القصر), then customize room by room |
| Bridal reservation | Deposit + price lock; defaults 10% / 30 days, editable in admin |
| Bridal extras | Share on WhatsApp; installments for the package (arranged in showroom) |
| Bridal delivery | No fixed date; bride may suggest a date, store calls to agree |
| Checkout | Guest only (name, phone, address) |
| Payments at launch | COD; InstaPay / Vodafone Cash with proof on WhatsApp; Fawry kept but its manual method is an open question for the owner (§13) |
| COD on large orders | Orders above 30,000 ج.م paid by COD need a 10% transfer deposit before dispatch; both values editable in admin |
| Coupon stacking | No stacking: coupons apply only to items that are not on a flash sale and have no old-price discount |
| Bridal lock contents | Locks item prices (regular prices, never temporary flash prices) and the zone delivery fee; stock is reserved only when the delivery date is agreed; coupons do not apply to bridal reservations |
| Floor / elevator | Not asked at checkout; the store asks on the confirmation call |
| Payment confirmation | Admin confirms/rejects via a one-tap secure link from the WhatsApp message (orders and deposits). In-WhatsApp buttons later |
| Delivery booking | None at checkout; customer messages WhatsApp for a specific day |
| Shipping | Internal (own trucks); site shows zone fees only |
| Order updates | Admin sends prefilled WhatsApp messages (click-to-WhatsApp) |
| After-order features | None at launch (no tracking page, pickup, returns form, invoice download) |
| Installments | Showroom only; site says they're available |
| Admin delivery tracking | Order status only |
| Traders | WhatsApp-only section |
| Accounts | Later phase |
| Promotions | Flash sale + countdown, old price / % off, coupon codes |
| Reviews | Open to anyone (name + private phone, stars + text), pending until admin approves |
| Admin modules | Orders (incl. bridal reservations), products, CMS, reviews, coupons, flash sales, reports |
| Roles | Single admin now; code ready for roles and permissions |
| CMS | Homepage sections + pages (About, policies, FAQ, guides) |
| Marketing | Category & brand landing pages, buying guides blog, Google Merchant feed |
| E-receipts | Later, after the accountant confirms |
| Phases | Launch + one later phase |
| Stack | Nuxt 4 + NestJS + PostgreSQL/Prisma + Tailwind + shadcn-vue; monorepo; VPS with Docker; admin inside the Nuxt app at `/admin` |
| PRD language | English with Arabic summary |

---

## 4. Scope by phase

### Phase 1 — Launch
| Epic | Summary |
|---|---|
| E1 Catalog & product page | Categories, brands, product page with gallery, specs, warranty, delivery cost, WhatsApp question |
| E2 Discovery | Search, filters, sort, compare, wishlist, "Help me choose" quiz |
| E3 Stock & availability | In stock / low / on request / out of stock with notify-me |
| E4 Bridal builder | Tiers, room-by-room editing, share, reserve with deposit and price lock |
| E5 Cart & checkout | Real cart, guest checkout, zone fees, coupons, order placement |
| E6 Payments & confirmation | COD and transfer methods, WhatsApp proof, one-tap admin confirmation |
| E7 Order lifecycle & updates | Statuses, prefilled WhatsApp updates |
| E8 Promotions | Flash sales, old price, coupons |
| E9 Reviews | Submit, moderate, display |
| E10 Traders section | WhatsApp-only B2B section |
| E11 Content, CMS & SEO | Homepage sections, pages, guides blog, landing pages, Merchant feed |
| E12 Admin | Auth, dashboard, orders, products, CMS, reviews, promotions, reports, settings |
| E13 Platform | Stack, performance, security, accessibility, analytics |

### Phase 2 — Later
| Epic | Summary |
|---|---|
| E14 Customer accounts | Phone OTP login, order history, saved bridal list and addresses |
| E15 Loyalty | Points on delivered orders, redemption, referrals |
| E16 Installable app (PWA) | Add to home screen, push for order updates and price drops |
| E17 WhatsApp Cloud API | Confirm/reject buttons inside WhatsApp, automatic status messages |
| E18 E-receipts | Egyptian Tax Authority e-receipt integration |
| E19 Roles & permissions | Turn on manager / content / orders roles |

---

## 5. Site map

```text
/                         Home (CMS sections)
/shop                     All products  (filters, sort, search)
/c/:category              Category landing page  (e.g. /c/fridges)
/b/:brand                 Brand landing page     (e.g. /b/samsung)
/p/:slug                  Product page
/compare                  Compare table (up to 3)
/wishlist                 Saved products
/help-me-choose/:category Quiz (fridges, washers, tvs, acs)
/bridal                   Bridal builder: tiers
/bridal/:listId           A bride's package (editable by owner link, read-only share link)
/cart                     Cart
/checkout                 Guest checkout
/order/:no/thanks         Order placed + payment instructions
/guides, /guides/:slug    Buying guides blog
/pages/:slug              About, policies (delivery, returns, warranty, privacy), FAQ
/traders                  Traders section (WhatsApp)
/admin/...                Admin (see E12)
/feeds/google.xml         Google Merchant feed
/sitemap.xml, /robots.txt
```

---

## 6. User stories and acceptance criteria

Format: **ID — As a … I want … so that …**, then acceptance criteria. Tags: `P1` launch, `P2` later. Customer-facing copy is written in Egyptian Arabic.

### E1 — Catalog & product page `P1`

**US-1.1 — Browse by category.** As a household buyer I want to browse products by category so that I see only what I need.
- Categories at launch: ثلاجات وفريزر، غسالات، شاشات وتلفزيونات، تكييفات، بوتاجازات وأفران، مراوح وتهوية، أجهزة مطبخ صغيرة، أدوات منزلية ومطبخ (with sub-categories such as حلل وأطقم، أطباق، أدوات تقديم).
- Each category has its own landing page with intro text editable in the admin.
- Empty categories are hidden from navigation.

**US-1.2 — Product card.** As a shopper I want each product card to show what matters so that I can decide without opening every product.
- Shows image, brand, model name, price, old price and % off when discounted, availability badge, wishlist toggle, compare toggle, add-to-cart button.
- A product that is out of stock shows «نفذ» instead of add-to-cart.
- Cards are the same component everywhere (shop, home, related, search results).

**US-1.3 — Product page.** As a shopper I want full details on one page so that I trust the purchase.
- Gallery (manufacturer images; real showroom photos marked «صورة حقيقية من المعرض» when present).
- Price, old price, saving in ج.م, availability, model code, warranty (provider + length + how to activate it, e.g. «فعّل الضمان على الخط الساخن للوكيل»), origin.
- Every price on the site carries «الأسعار شاملة ضريبة القيمة المضافة» (product page, cart, checkout).
- Spec table built from the category's spec template (e.g. fridge: capacity, cooling type, inverter, energy class, dimensions, colour).
- Delivery cost line computed from the four zones (المنصورة 100، مراكز الدقهلية 150، باقي الدلتا 250، باقي مصر 400 ج.م) with «التوصيل بعربيات المعرض».
- «التقسيط متاح في المعرض» note on products above an admin-set price.
- Buttons: add to cart, add to bridal list, ask on WhatsApp (prefilled with product name and link), compare, wishlist.
- Mobile: sticky bottom bar with price and add-to-cart.
- Approved reviews and average rating (E9); related products from the same category.

**US-1.4 — Cookware products.** As a cookware shopper I want sets and single pieces with their contents so that I know what I get.
- Cookware products support "set contents" (list of pieces) and material/coating fields.
- Brand pages exist for each Turkish brand with the brand logo from `assets/brands/`.

**US-1.5 — Spec templates.** As an admin I want each category to have a spec template so that specs are consistent and filterable.
- A template defines fields, types (text, number + unit, yes/no, choice) and which fields are filterable and comparable.
- Product forms show the fields of the product's category.

### E2 — Discovery `P1`

**US-2.1 — Smart search.** As a shopper I want instant search so that I find a model by name, brand or category.
- Results appear while typing (debounced), showing image, name, price and add-to-cart.
- Arabic-aware matching: ignores hamza forms (أ إ آ → ا), ة/ه, ى/ي and diacritics; converts Arabic-Indic digits (٠-٩ → 0-9); matches model codes.
- Synonyms list editable in admin, seeded with brand and tech pairs (إل جي ↔ LG، سامسونج ↔ Samsung، انفرتر ↔ Inverter، نوفروست ↔ No Frost).
- No results: «مفيش نتايج لـ "…"» plus top categories and a WhatsApp «اسألنا» button.

**US-2.2 — Filters and sort.** As a shopper I want to narrow results so that I compare only relevant products.
- Filters: category, brand (multi-select), price range, availability, discounted only, and the category's filterable spec fields.
- Sort: most popular (units in delivered orders over the last 90 days, ties broken by newest), price low→high, price high→low, biggest discount, newest.
- Filters are reflected in the URL so a filtered page can be shared and indexed.
- Mobile: filters open in a bottom sheet with a live result count on the apply button.

**US-2.3 — Compare.** As a shopper I want to compare up to 3 products side by side so that I see the real differences.
- Floating compare bar shows selected products; adding a 4th asks to replace one.
- Compare page rows: price, brand, the category's comparable fields, warranty, origin; differences highlighted.
- Comparing products from different categories shows only common rows and a note.

**US-2.4 — Wishlist.** As a shopper I want to save products for later without an account so that I can come back.
- Stored in the browser; header count badge; move-to-cart and remove.
- Each wishlist entry stores the price when it was added (`priceAtAdd`); on open, current prices are fetched with `GET /api/products?ids=…` and items whose price is now lower show «السعر نزل».

**US-2.5 — Help me choose quiz.** As an unsure shopper I want to answer a few questions so that the store recommends the right model.
- Available for fridges, washers, TVs and ACs.
- 3–5 questions per category (e.g. fridge: family size, kitchen space, budget, preference for inverter); every question has «مش متأكد».
- Result: up to 3 recommended products with a one-line reason each («مناسبة لعيلة 5 أفراد وموفرة في الكهربا»), plus «شوف كل النتايج».
- Scoring: each answer carries rules of the form *spec condition → points* (e.g. capacity ≥ 450 L → +3). Visible, in-stock products in the category are scored; the top 3 are shown; ties go to the higher popularity. The reason line is the label of the highest-scoring matched rule.
- Questions, answers and rules are editable in the admin.

### E3 — Stock & availability `P1`

**US-3.1 — Availability states.** As a shopper I want clear availability so that I'm not surprised after ordering.
- Each product has `availabilityMode`: **auto**, **on_request** or **out**.
  - **auto** derives the label from stock: متوفر (stock > threshold), كمية محدودة (1 ≤ stock ≤ threshold), نفذ (stock = 0). Cart quantity is capped at stock.
  - **on_request** shows «متاح بالطلب 3–7 أيام» (lead time text set by admin) and is orderable regardless of stock.
  - **out** shows نفذ regardless of stock.
- Checkout shows the lead time for on-request items.

**US-3.2 — Notify me.** As a shopper I want to be told when an item is back so that I don't keep checking.
- On «نفذ» products: «بلّغني أول ما يوصل» collects name + phone.
- One request per (product, phone); repeats update the date.
- Admin sees the waiting list per product; when restocked, each entry has a «ابعت على واتساب» button with a prefilled message and link; opening it marks the entry sent (`PATCH /api/admin/notify-me/:id`).

**US-3.3 — Stock movements.** As the admin I want stock to change automatically so that the site never sells what we don't have.
- Retail orders deduct stock when they move to «مؤكد» and restore it when cancelled.
- Bridal reservations deduct stock when the admin records the agreed delivery date, and restore it if the reservation is cancelled after that.
- Every change is written as a stock movement (product, quantity, reason, order, admin, time).
- If an item in an unreserved bridal list or a tier goes out of stock, the list shows it as «نفذ — اختاري بديل» and the reserve button stays disabled until it is swapped or removed; tiers flag the item in the admin.

### E4 — Bridal builder ("جهّز بيتك") `P1` — signature feature

**US-4.1 — Choose a tier.** As a bride I want to start from a ready package so that I don't build from zero.
- Three tiers shown side by side: أساسية، ذهبية، القصر, each with total, room count, item count and highlights.
- Tier contents are defined in the admin and use real products.

**US-4.2 — Customize room by room.** As a bride I want to change items per room so that the package fits my home and budget.
- Rooms: المطبخ، الغسيل، الصالة، أوض النوم (تكييفات)، أجهزة صغيرة، أدوات المطبخ.
- For each item: swap (alternatives are visible products in the same category as that item, with price difference), remove, change quantity; add any product from the catalog.
- Live total, per-room subtotal and difference vs. the tier's starting total.
- The list is saved automatically and reachable later via its private edit link (no account needed).
- Once reserved, the list is frozen for the bride; further changes are made by the admin on the reservation.

**US-4.3 — Share with family.** As a bride I want to send the list to my family on WhatsApp so that we decide together.
- «شاركيها على واتساب» opens WhatsApp with a summary and a read-only link.
- One route, `/bridal/:token`, serves both modes: the edit token opens edit mode, the share token opens read-only mode. The API returns `mode: edit | view` and never returns the edit token to a share-token request.
- The read-only page shows items, totals and a «كلّموا المعرض» WhatsApp button; it cannot edit the list.

**US-4.4 — Reserve with deposit and price lock.** As a bride I want to lock today's prices so that I'm protected from price increases before the wedding.
- The locked total = items at their regular prices (flash sale prices are never locked) + the zone delivery fee. Coupons don't apply to bridal reservations.
- «احجزي بعربون» shows deposit = deposit % × locked total (default 10%) and the lock period (default 30 days), both from admin settings.
- Form: name, phone, governorate/zone, address, optional preferred delivery date and notes.
- Payment: details of the enabled transfer methods (InstaPay / Vodafone Cash, and Fawry once confirmed) are shown; «ابعتي إثبات التحويل على واتساب» opens WhatsApp to the store with the reservation number, amount and the admin confirmation link (E6).
- The reservation is created as status «بانتظار العربون»; the lock starts only when the admin confirms the deposit, and the confirmation message states the lock end date.
- The deposit may arrive as several transfers (wallet limits); each confirmed transfer adds to the amount paid, and the lock starts when the amount paid reaches the deposit.
- Prices of reserved items do not change for that reservation during the lock, even if catalog prices change.
- «التقسيط متاح في المعرض» is shown with a WhatsApp button to arrange it.

**US-4.5 — Agree on delivery.** As a bride I want to choose when things arrive so that it fits the wedding plan.
- Preferred date is optional; the confirmation says «هنكلمك نتفق على ميعاد التوصيل والتركيب».
- Admin records the agreed date on the reservation.

**US-4.6 — Lock expiry.** As an admin I want to know when locks are expiring so that I follow up before prices change.
- Reservations show days left; the dashboard lists locks ending within 7 days.
- After expiry, the reservation shows «انتهى تثبيت السعر»; the admin can **extend** it (new end date) or **re-price** it (items take current regular prices, the difference is shown and a prefilled WhatsApp message explains it).

### E5 — Cart & checkout `P1`

**US-5.1 — Real cart.** As a shopper I want my cart to be the source of what I pay so that the checkout total is correct.
- Cart drawer and cart page share one state (browser storage, synced to the server on checkout).
- Change quantity, remove, see subtotal, discount, delivery fee by zone and total.
- Prices are re-checked against the server at checkout; changed prices are shown before placing the order.

**US-5.2 — Guest checkout.** As a shopper I want to order without an account so that it's fast.
- Fields: full name, mobile, governorate, city/markaz, address, notes. The zone (and fee) is derived from governorate + city, so Mansoura/Talkha and the other Dakahlia centers get their correct fees.
- Mobile numbers accept Arabic-Indic digits and spaces and are normalized to `01[0125]XXXXXXXX`; the normalized number is what's stored and matched everywhere.
- No delivery date picker; text: «لو محتاج يوم معيّن كلّمنا على واتساب» with a WhatsApp link.
- Order summary always visible; on mobile the total and place-order button are sticky.
- Target: median completion < 90 seconds.

**US-5.3 — Apply a coupon.** As a shopper I want to enter a code so that I get the campaign discount.
- Valid codes show the saving immediately; invalid or expired codes show the reason («الكود انتهى»، «الحد الأدنى للطلب 5,000 ج.م»).
- One coupon per order. Coupons apply only to eligible items: items not on a flash sale, without an old-price discount, and inside the coupon's category/brand scope. Minimum order and % discounts are computed on eligible items only.
- Redemptions are recorded per order and phone; cancelled or payment-rejected orders release their redemption.

**US-5.4 — Order placed.** As a shopper I want clear next steps so that I know what happens now.
- Thank-you page shows order number, items, total, payment method and next step.
- COD: «هنكلمك نأكد الطلب». Transfer: payment details + «ابعت إثبات التحويل على واتساب» button.
- The page lives at `/order/:no/thanks?t=:publicToken`; without the right token it shows nothing about the order.

**US-5.5 — Deposit on large COD orders.** As the store I want a small deposit on big cash orders so that fake orders don't waste a truck trip.
- COD orders above the admin threshold (default 30,000 ج.م) require a transfer deposit (default 10%) before dispatch; checkout explains this before the order is placed.
- These orders start at «بانتظار العربون» and follow the same WhatsApp proof and confirm flow; the rest is paid on delivery.

### E6 — Payments & confirmation `P1`

**US-6.1 — Payment methods.** As a shopper I want familiar ways to pay so that I trust the store.
- COD; InstaPay; Vodafone Cash; Fawry (only if the owner confirms a manual Fawry method — see §13). Each method can be turned on/off in admin with its account details.
- COD orders start as «جديد». Transfer orders start as «بانتظار الدفع». Large COD orders start as «بانتظار العربون» (US-5.5).

**US-6.2 — Proof on WhatsApp.** As a shopper paying by transfer I want to send proof easily so that my order is confirmed fast.
- The button opens WhatsApp to the store number with: order/reservation number, amount, method, and the admin confirmation link.

**US-6.3 — One-tap confirm from WhatsApp.** As an admin I want to confirm or reject a payment from the WhatsApp chat so that I don't need a computer.
- The link opens `/admin/confirm/:token` on the admin's phone; if not logged in, it asks for login then returns to the same page.
- The page shows order/reservation summary, expected amount and method, with «تأكيد الدفع» and «رفض» (reject requires a reason).
- Tokens are random, tied to one order, stay valid until the order is confirmed or cancelled, and are useless without an admin session.
- Confirm moves the order to «مؤكد» (or starts the bridal price lock); reject moves it to «الدفع مرفوض» and offers a prefilled WhatsApp reply to the customer.
- After «الدفع مرفوض» the customer can send a new proof; the admin can still confirm from the same link or from the order page.
- The same confirm/reject actions exist on the order page in the admin, so a deleted or edited link never blocks confirmation.
- Each confirmed transfer is recorded as a payment (amount, method, time, admin); partial payments add up.
- Same flow for orders, large-COD deposits and bridal deposits.

### E7 — Order lifecycle & updates `P1`

**US-7.1 — Statuses.** As an admin I want a simple status flow so that the team knows where each order is.
- Orders paid COD: جديد → مؤكد → خرج للتوصيل → تم التسليم.
- Orders paid by transfer: بانتظار الدفع → مؤكد → …; large COD: بانتظار العربون → مؤكد → …
- Side states: ملغي (from any state before delivery) and الدفع مرفوض (can return to مؤكد when a valid proof arrives).
- Bridal reservations: بانتظار العربون → محجوز (السعر مثبت) → اتفقنا على التوصيل → تم التسليم; plus ملغي and انتهى التثبيت.
- Every change is stored with time and admin user (history).

**US-7.2 — WhatsApp updates.** As an admin I want to message the customer at each step in one tap so that they stay informed without paid APIs.
- Each status change shows «ابعت للعميل على واتساب», opening WhatsApp with a prefilled message for that status (templates editable in settings).
- The order records that the message was opened.

### E8 — Promotions `P1`

**US-8.1 — Old price and % off.** As a shopper I want to see the saving so that I know it's a real deal.
- Products have an optional old price; % off is computed and shown only when old price > price.

**US-8.2 — Flash sales.** As an admin I want time-limited sales so that I create urgency.
- A flash sale has products, sale price per product, start and end time.
- The home flash section and product pages show a countdown; prices revert automatically at the end.
- Overlapping flash sales for the same product are blocked.

**US-8.3 — Coupons.** As an admin I want discount codes so that I can run campaigns.
- Code, type (% or fixed ج.م), value, minimum order, start/end, total and per-phone usage limits, optional category/brand restriction.
- Usage count and revenue per coupon visible in reports.

### E9 — Reviews `P1`

**US-9.1 — Write a review.** As a customer I want to rate a product so that I help others.
- Form: name, phone (never shown publicly), 1–5 stars, text (20–1000 characters).
- After submit: «شكراً! تقييمك هيظهر بعد المراجعة».
- Spam protection: one review per phone per product, rate limit per IP, honeypot field.

**US-9.2 — Moderate.** As an admin I want to approve reviews before they appear so that the brand stays clean.
- Queue of pending reviews with product, stars, text and phone; approve / reject; optional public reply from the store.
- Only approved reviews count toward the average rating.
- A review is tagged «اشترى من المعرض» only when its phone has a delivered order that contains that product.
- Approved reviews can be unpublished or deleted later.

### E10 — Traders section `P1`

**US-10.1 — Reach sales.** As a trader I want to contact the sales team quickly so that I can get wholesale prices.
- `/traders` page and a home section: who we serve, brands we carry, «كلّم قسم الجملة على واتساب» with a prefilled message asking for business name and governorate.
- WhatsApp number for traders is separate in settings (may equal the main one).

### E11 — Content, CMS & SEO `P1`

**US-11.1 — Homepage sections.** As an admin I want to edit, reorder and hide homepage sections so that the site stays fresh without a developer.
- Sections: announcement bar, hero, categories, flash sale, bridal, traders, about, partners/brands, traders' reels, guides, footer.
- Draft → preview (desktop/mobile) → publish, with version history and restore (as in the admin prototype).

**US-11.2 — Pages.** As an admin I want to edit content pages so that policies and info are always correct.
- Pages: About, delivery policy, returns policy, warranty, privacy, FAQ.
- The returns policy follows Consumer Protection Law 181/2018 and separates two cases: returning an unused item within 14 days, and defective items handled with the brand's authorized service under the law and warranty terms. Final wording to be checked by the store's lawyer.
- Rich text editor; each page has SEO title and description.

**US-11.3 — Buying guides blog.** As a shopper I want practical guides so that I buy the right appliance.
- Articles with cover image, body, related products and category tags; editable in admin.
- Existing guides from the prototype are migrated.

**US-11.4 — Landing pages and structured data.** As the business I want to rank on Google for local searches so that buyers find us.
- Category and brand pages with editable intro text and SEO fields (e.g. «ثلاجات سامسونج في المنصورة»).
- Product pages emit `Product`, `Offer`, `AggregateRating` (approved reviews only) and `BreadcrumbList` schema; the site emits `LocalBusiness` with showroom address and hours.
- Server-rendered pages, clean URLs, sitemap.xml, canonical URLs for filtered pages.

**US-11.5 — Google Merchant feed.** As the business I want products in Google Shopping so that we get shopping traffic.
- `/feeds/google.xml` lists in-stock, visible products with id, title, description, link, image, price, sale price (during flash sales), availability, brand, condition.
- Regenerated at least hourly.

### E12 — Admin `P1`

The admin lives at `/admin` in the Nuxt app and follows the design of the approved admin prototype (`admin/`, canvas «لوحة تحكم محمد سراج»): Arabic RTL, Serag green and gold, light/dark theme, command palette (Ctrl/⌘+K), "G then key" shortcuts, toasts with undo.

**US-12.1 — Login.** As the admin I want a secure login so that only I can manage the store.
- Email/phone + password, rate-limited; session expires after 14 days of inactivity.
- One admin user at launch. Users, roles and permissions exist in the data model and every API endpoint checks a permission (default role «مدير» has all), so roles can be enabled later without code changes to endpoints (E19).

**US-12.2 — Dashboard.** As the admin I want to see what needs action today so that nothing is missed.
- New orders, payments waiting for confirmation, deposits waiting, locks expiring within 7 days, pending reviews, notify-me lists ready to send, low-stock products.
- Revenue and order charts for 7/30/90 days.

**US-12.3 — Orders.** As the admin I want to manage orders and bridal reservations in one place so that operations are simple.
- Filter by type (order / bridal), status, payment method, zone, date; search by number, name, phone.
- Detail: customer, items with locked prices, totals, coupon, payments received vs. expected, history, notes; actions per status (E7) including confirm/reject payment; for bridal reservations extend lock, re-price and record agreed delivery date; WhatsApp message buttons; print invoice for internal use.
- Revenue in reports counts an order when it is delivered; deposits are reported separately as money received.
- Export visible orders to CSV.

**US-12.4 — Products.** As the admin I want to manage the catalog so that the site is always accurate.
- Create/edit/archive products: names, slug, model code, brand, category, spec fields, price, old price, stock, availability mode, low-stock threshold, warranty and activation note, origin, images (upload, reorder, mark real photo), visibility, featured, SEO fields.
- Products that appear in any order are archived, never hard-deleted; archived products leave the site but keep their history.
- Bulk price/stock update by CSV import matched on model code, with a preview of changes before applying.
- Live preview of the product card.

**US-12.5 — Bridal setup.** As the admin I want to manage tiers and reservation rules so that the builder matches what the showroom offers.
- Edit the three tiers (rooms and default products).
- Settings: deposit % (default 10), lock days (default 30), installment note threshold.

**US-12.6 — CMS.** Covers US-11.1 to US-11.3.

**US-12.7 — Reviews, coupons, flash sales.** Covers US-9.2, US-8.2, US-8.3.

**US-12.8 — Notify-me lists.** Covers US-3.2.

**US-12.9 — Reports.** As the admin I want sales reports so that I know what works.
- Revenue, orders and average order value by day / week / month; split by category, brand, payment method, zone, order vs. bridal.
- Best sellers, coupon performance, flash sale performance, conversion of bridal lists → reservations → delivered.
- Repeat-customer rate by phone number.
- Export each report to CSV.

**US-12.10 — Settings.** As the admin I want to manage store settings so that I never need a developer for them.
- Store info, WhatsApp numbers (main, traders), payment methods and account details, delivery zones (with the governorates/cities in each) and fees, large-COD deposit threshold and %, low-stock default, search synonyms, WhatsApp message templates with named variables (`{{customerName}}`, `{{orderNo}}`, `{{total}}`…), quiz rules (US-2.5).

### E13 — Platform `P1`
See sections 7 and 8.

### E14 — Customer accounts `P2`
**US-14.1** Login with phone + one-time code. **US-14.2** See order history and statuses. **US-14.3** Saved addresses. **US-14.4** Bridal lists attached to the account. **US-14.5** Guest orders with the same phone appear in the account after first login.

### E15 — Loyalty `P2`
**US-15.1** Earn points on delivered orders (rate set in admin, e.g. 1 point per 100 ج.م). **US-15.2** Redeem points at checkout with a cap per order. **US-15.3** Referral code: friend gets a discount, referrer gets points after the friend's order is delivered.

### E16 — Installable app (PWA) `P2`
**US-16.1** Add to home screen with Serag icon and splash. **US-16.2** Push notifications for order status and wishlist price drops (opt-in). **US-16.3** Recently viewed products available offline.

### E17 — WhatsApp Cloud API `P2`
**US-17.1** Admin receives proof messages with «تأكيد» / «رفض» buttons that update the order. **US-17.2** Status updates sent automatically using approved templates. **US-17.3** Notify-me messages sent automatically on restock.

### E18 — E-receipts `P2`
**US-18.1** Issue Egyptian Tax Authority e-receipts for delivered orders, once the accountant confirms the store's registration.

### E19 — Roles & permissions `P2`
**US-19.1** Add admin users. **US-19.2** Roles manager / content / orders with predefined permissions. **US-19.3** Audit log of admin actions.

---

## 7. Non-functional requirements

| Area | Requirement |
|---|---|
| Language & direction | Arabic, `dir="rtl"`, Egyptian dialect copy; numbers in Latin digits (Outfit); structure ready for English later |
| Brand | Tokens from the design: green `#16291E`/`#2A4D38`, gold `#B5A45C`/`#D2C27A`, cream `#F4F1E6`/`#FAF7EE`; Lalezar (display), IBM Plex Sans Arabic (body), Outfit (numbers) |
| Performance | LCP < 2.5 s and CLS < 0.1 on mid-range Android over 4G; home page JS < 200 KB gzipped; images in AVIF/WebP with responsive sizes and lazy loading |
| Mobile | Works from 320 px; bottom navigation; sticky buy bars; 44 px touch targets |
| Accessibility | WCAG 2.2 AA: keyboard reachable, visible focus, labels, 4.5:1 contrast, reduced motion respected |
| SEO | Server-side rendering for public pages; structured data; sitemap; canonical URLs |
| Security | HTTPS only; input validation on the API (DTO validation); output escaping; rate limits on checkout, reviews, notify-me, login; CSRF protection for admin; secrets in env vars; daily database backups kept 30 days |
| Privacy | Phone numbers never shown publicly; privacy policy page; data deletion on request; public order and bridal pages only reachable with random tokens |
| Prices | All prices VAT-inclusive and labelled «شاملة ضريبة القيمة المضافة» |
| Reliability | Orders are never lost: checkout writes to the database before showing the thank-you page; idempotent order creation |
| Observability | Structured API logs, error tracking, uptime check |
| Browsers | Latest Chrome, Safari iOS, Samsung Internet, Firefox, Edge |

---

## 8. Architecture and tech stack

| Layer | Choice |
|---|---|
| Repo | Monorepo (pnpm workspaces + Turborepo): `apps/web` (Nuxt 4 storefront + `/admin`), `apps/api` (NestJS), `packages/shared` (types, validation schemas, constants) |
| Frontend | Nuxt 4 (SSR), Tailwind CSS, shadcn-vue components themed with the brand tokens |
| Backend | NestJS REST API, modules per domain (catalog, orders, bridal, promotions, reviews, content, settings, auth, reports, feeds) |
| Database | PostgreSQL with Prisma (schema, migrations, seed from current `config.js` catalog and admin seed) |
| Files | Product and content images on the VPS volume (or S3-compatible storage), served through an image resizer/CDN |
| Hosting | VPS with Docker Compose: web, api, postgres, reverse proxy (TLS) |
| Auth | Session/JWT for admin; permission guard on every admin endpoint |

The admin prototype's data layer (`admin/assets/store.js`) already names its operations after the planned endpoints and is the reference for the admin API.

### 8.1 API outline (REST)
```text
Public
GET  /api/catalog/categories            GET /api/catalog/brands
GET  /api/products?ids=a,b,c             (wishlist refresh)
GET  /api/products?filters              GET /api/products/:slug
GET  /api/search?q=                     GET /api/quiz/:category
POST /api/notify-me                     POST /api/reviews
GET  /api/bridal/tiers                  POST /api/bridal/lists      GET/PATCH /api/bridal/lists/:token  (edit token only for PATCH; frozen once reserved)
POST /api/bridal/lists/:token/reserve
POST /api/cart/quote                    (re-price cart, zone fee, coupon)
POST /api/orders                        GET /api/orders/:no/thanks?t=:publicToken
GET  /api/content/home                  GET /api/pages/:slug         GET /api/guides[/:slug]
GET  /feeds/google.xml

Admin (permission-checked)
/api/admin/auth/*
/api/admin/dashboard
/api/admin/orders[/:id]                 PATCH status, notes, agreed delivery date
/api/admin/orders/:id/payments          POST record/confirm, POST reject
/api/admin/orders/:id/lock-extend       POST (bridal)
/api/admin/orders/:id/reprice           POST (bridal)
/api/admin/confirm/:token               GET summary, POST confirm|reject
/api/admin/products[/:id]               POST /api/admin/products/import (preview + apply)
/api/admin/categories, /brands, /spec-templates
/api/admin/bridal/tiers, /settings
/api/admin/promotions/flash-sales, /coupons
/api/admin/reviews[/:id]                 PATCH approve|reject|unpublish|reply, DELETE
/api/admin/notify-me[/:id]               PATCH mark sent
/api/admin/content/home (draft, publish, versions), /pages, /guides
/api/admin/reports/*
/api/admin/settings
```

---

## 9. Data model (core entities)

| Entity | Key fields |
|---|---|
| Category | id, name, slug, parent, specTemplateId, intro, seo, sort, visible |
| Brand | id, name, slug, logo, intro, seo |
| SpecTemplate | id, fields[{key, label, type, unit, options, filterable, comparable}] |
| Product | id, slug, name, modelCode (unique), brandId, categoryId, specs{}, price, oldPrice, stock, lowStockThreshold, availabilityMode (auto / on_request / out), leadTimeText, warranty, warrantyActivation, origin, setContents[], images[{url, isReal, sort}], visible, featured, archivedAt, taxRate, etaItemCode (P2), seo |
| StockMovement | id, productId, qty (±), reason (order_confirmed / order_cancelled / bridal_delivery_agreed / manual / import), orderId?, by, at |
| FlashSale | id, name, startsAt, endsAt, items[{productId, salePrice}] |
| Coupon | id, code, type, value, minOrder, startsAt, endsAt, maxUses, maxUsesPerPhone, scope{categories, brands} |
| CouponRedemption | id, couponId, orderId, customerPhone, amount, status (active / released) |
| Order | id, no, type (order / bridal), customerPhone (normalized, indexed), customerId? (P2), customer{name, governorate, city, zoneId, address, notes}, items[{productId, name, modelCode, qty, unitPrice, taxRate}], subtotal, discount, couponId, deliveryFee, total, paymentMethod, depositPct, depositAmount, paidAmount, status, history[{status, at, by}], publicToken, confirmToken, bridalListId?, lockedUntil?, preferredDate, agreedDeliveryDate |
| Payment | id, orderId, method, amount, status (confirmed / rejected), rejectReason, by, at |
| WhatsAppMessage | id, orderId?, to, templateKey, variables{}, channel (link / cloud_api), status (opened / sent / delivered / failed), at |
| BridalList | id, editToken, shareToken, tierId, rooms[{key, items[{productId, qty}]}], status (draft / reserved), reservationOrderId? |
| BridalTier | id, name, rooms[{key, items[{productId, qty}]}] |
| Review | id, productId, name, phone, stars, text, status (pending / approved / rejected), reply, verifiedBuyer, createdAt |
| NotifyRequest | id, productId, name, phone, status (waiting / sent), createdAt |
| ContentVersion | id, page, draft, published, layout{order, hidden}, publishedAt, by |
| Page / Guide | id, slug, title, body, cover, relatedProducts[], seo, published |
| QuizRule | category, questions[], rules[] |
| Settings | store, whatsapp{main, traders}, payments{}, zones[{name, fee, places[{governorate, city}]}], codDeposit{threshold, pct}, bridal{depositPct, lockDays, installmentThreshold}, searchSynonyms[], templates{key: {text, variables[]}} |
| User / Role / Permission | admin users; roles and permission keys (one role at launch) |
| AuditLog | id, userId, action, entity, entityId, before, after, at |

---

## 10. Integrations

| Integration | Phase | Notes |
|---|---|---|
| WhatsApp click-to-chat (`wa.me`) | P1 | Product questions, proof of payment, status updates, notify-me, traders |
| Google Merchant Center | P1 | XML feed |
| Google Search Console / sitemap | P1 | |
| Analytics | P1 | Privacy-friendly analytics (e.g. self-hosted Plausible/Umami) for funnel KPIs; no ad pixels at launch |
| WhatsApp Cloud API | P2 | Buttons and automatic messages |
| ETA e-receipt | P2 | After accountant confirms |
| Web Push | P2 | PWA notifications |

---

## 11. KPIs and how we measure them

| KPI | Target | Source |
|---|---|---|
| Conversion rate | > 2.8% | Analytics sessions vs. orders in DB |
| Checkout completion time | < 90 s median | Analytics events checkout_start → order_placed |
| Bounce rate | < 38% | Analytics |
| Bridal reservations | ≥ 30 / month | Orders of type bridal with deposit confirmed |
| Repeat customers | ≥ 20% of orders | Orders whose phone has an earlier delivered order |
| Payment confirmation time | < 2 hours median (working hours) | Order history: awaiting payment → confirmed |
| Review moderation time | < 24 hours | Review createdAt → decision |

---

## 12. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Price lock exposes the store to supplier price increases | Deposit and lock days are admin-configurable per period; dashboard alerts on expiring locks |
| Fake or unpaid COD orders | Phone validation, rate limits, admin confirmation call before dispatch |
| Fake transfer proofs | Admin checks the wallet/bank before tapping confirm; confirm page shows exact expected amount |
| Wallet/InstaPay transfer limits on large deposits | Multiple transfers allowed; payments add up to the deposit |
| Confirmation link forwarded to others | Link requires an admin session; token scoped to one order and expires |
| Thin product content hurts SEO and trust | Spec templates mandatory per category; real photos for top sellers first |
| Review spam | Pending-by-default, one per phone per product, rate limits |
| WhatsApp workload for one admin | Prefilled messages; P2 moves to Cloud API automation |
| Catalog size growth | CSV import with preview |

---

## 13. Open questions

1. Store working hours and showroom address/map for `LocalBusiness` schema and the contact page.
2. Real WhatsApp numbers, InstaPay address, Vodafone Cash number and Fawry code (prototype values are placeholders).
3. Exact tier contents and prices for أساسية / ذهبية / القصر.
4. Price threshold for showing «التقسيط متاح في المعرض».
5. Domain name.
6. Who photographs the top 50 products and when.
7. Analytics tool choice (Plausible vs. Umami vs. GA4 with consent).
8. Does the store want a cookie banner if no ad pixels are used? (Only needed for non-essential cookies.)
9. **Fawry:** how does the store receive Fawry payments today (a Fawry wallet number, a merchant reference code, or not at all)? Fawry stays off until answered.
10. Exact list of cities/markaz per delivery zone.
11. Returns policy wording reviewed by the store's lawyer.

---

## 14. Glossary

| Term | Meaning |
|---|---|
| جهاز العروسة | A bride's complete set of home appliances and kitchenware |
| عربون | Deposit |
| تثبيت السعر | Price lock |
| COD | Cash on delivery |
| InstaPay / Vodafone Cash / Fawry | Egyptian instant transfer, mobile wallet and bill-payment networks |
| Zone | One of the four delivery fee areas |

---

## 15. Review log

| Date | Reviewer | Result | Changes |
|---|---|---|---|
| 2026-10-16 | Gemini 4 Argon (via agy), checked by Claude | Changes requested: 3 blockers, 5 major, 1 minor; 4 owner questions | Added deposit/payment fields and Payment entity; public and bridal token rules; fixed status flows and confirm-link lifetime; stock movements and availability modes; coupon eligibility and redemptions; zone by city; VAT label; returns policy split; search digit normalization, synonyms and model codes; verified-buyer rule; P2-ready fields (customerPhone, archivedAt, taxRate, etaItemCode, WhatsAppMessage, AuditLog); testable rules for popularity, wishlist price drop, quiz scoring, bridal swaps. Owner answers: no coupon stacking; bridal lock covers prices + delivery fee, stock held at agreed delivery date; COD above 30,000 ج.م needs 10% deposit; floor/elevator asked on the call; Fawry method open. |

