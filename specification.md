# Sample E‑Commerce — Product & Engineering Specification

> Single source of truth for Engineering and QA. If code and this document disagree, update this document in the same PR. Referenced by `CLAUDE.md`.

- **Status:** Draft v1 — ready to build
- **Last updated:** 2026-06-23
- **Stack:** Next.js (App Router, TypeScript) · PostgreSQL + Prisma · NextAuth (credentials) · Nodemailer (SMTP) · Tailwind CSS · Vercel
- **QA:** testRigor plain‑English E2E tests, driven from this repo (see `.skills/testrigor-*`)

---

## 1. Overview

A storefront + back office for a single‑store online retailer, modeled loosely on Amazon's buying experience.

**Two surfaces, one app:**

1. **Storefront** (public) — browse and search products, filter by category, view product details, add to cart, and check out as a guest or signed‑in customer providing shipping and billing details. Customers receive email notifications about their order.
2. **Back office** (`/admin`, owner‑only) — the store owner signs in to see incoming orders, update order status, set a tracking number/carrier, edit the catalog, and manage stock.

### 1.1 Product goals

- A shopper can go from landing → find a product → cart → paid order in under 2 minutes with no account.
- The owner can fulfill an order (view → mark processing → ship with tracking) in under 1 minute.
- Every order state change that matters to the customer triggers an email.

### 1.2 Explicit non‑goals (v1)

- No real money movement — payment is a **mock/demo** processor (see §7). Architecture must allow swapping in Stripe later without schema changes.
- No multi‑vendor / marketplace, no multi‑currency (USD only), no multi‑warehouse.
- No product reviews/ratings, wishlists, discount codes/coupons, or tax‑jurisdiction engine (flat tax rate only).
- No mobile apps (responsive web only).

### 1.3 Key product decisions (locked)

| Area | Decision |
|------|----------|
| Payment | **Mock/demo** processor that always approves a known test card; isolated behind a `PaymentProvider` interface so Stripe can drop in later. |
| Accounts | **Guest checkout + optional accounts.** No login required to buy; customers may create an account to view order history. |
| Persistence / hosting | **PostgreSQL + Prisma**, deployed on **Vercel** (Postgres via Neon/Supabase). |
| Email | **SMTP via Nodemailer** (any provider). In dev, a console/preview transport. |
| Admin auth | **Single owner**, email/password via NextAuth credentials provider. |

---

## 2. Personas & roles

| Persona | Description | Auth |
|---------|-------------|------|
| **Guest shopper** | Browses, searches, buys without an account. | None (anonymous session/cart cookie) |
| **Registered customer** | Same as guest + persistent order history and saved addresses. | NextAuth credentials (`role: CUSTOMER`) |
| **Store owner / admin** | Manages catalog and fulfills orders in the back office. | NextAuth credentials (`role: ADMIN`) |

Authorization rules:
- `/admin/**` requires an authenticated session with `role = ADMIN`. Enforced in middleware **and** re‑checked in every admin server action / route handler.
- A customer may only read/cancel **their own** orders (matched by user id, or by order email + order number for guests).
- All write endpoints validate the caller's role server‑side; never trust the client.

---

## 3. Architecture

### 3.1 High level

```
Browser ──HTTP──▶ Next.js (App Router, RSC + server actions)
                     │
                     ├── Prisma ──▶ PostgreSQL
                     ├── PaymentProvider (mock | stripe)
                     └── Mailer (Nodemailer SMTP)  ──▶ customer & owner inboxes
```

- **Rendering:** React Server Components by default. Catalog/PDP/category pages are server‑rendered and cacheable. Cart and checkout are dynamic.
- **Mutations:** Prefer **server actions** for forms (add to cart, checkout, admin updates). Use **route handlers** (`app/api/**`) only for things that need a stable URL: payment webhook, health check, and any JSON consumed by tests.
- **State:** Cart lives server‑side keyed by an HTTP‑only `cartId` cookie; survives refresh and (for logged‑in users) merges into their account on login.

### 3.2 Tech stack & versions

| Concern | Choice | Notes |
|--------|--------|-------|
| Framework | Next.js (latest stable, App Router) | TypeScript strict mode |
| Language | TypeScript | `strict: true`, no implicit `any` |
| DB | PostgreSQL 15+ | Vercel Postgres / Neon / Supabase |
| ORM | Prisma | Migrations checked into repo |
| Auth | NextAuth (Auth.js) | Credentials provider, JWT sessions |
| Email | Nodemailer | SMTP transport from env; console transport in dev |
| Styling | Tailwind CSS | + a small component set (shadcn/ui acceptable) |
| Validation | Zod | Shared schemas for forms + server actions |
| Money | integer **cents** everywhere | never floats for money |
| Images | next/image | product images via URL or `/public` in demo |
| Tests (E2E) | testRigor | see §13 |
| Hosting | Vercel | Preview deploy per PR for QA |

### 3.3 Project structure (target)

```
app/
  (storefront)/
    page.tsx                     # home / featured
    search/page.tsx              # search results
    category/[slug]/page.tsx     # category listing
    product/[slug]/page.tsx      # product detail (PDP)
    cart/page.tsx
    checkout/page.tsx            # shipping + billing + payment
    checkout/confirmation/[orderNumber]/page.tsx
    orders/lookup/page.tsx       # guest order lookup
    account/                     # customer account (optional login)
      page.tsx                   # order history
      login/page.tsx
      register/page.tsx
  admin/
    layout.tsx                   # guards role=ADMIN
    login/page.tsx
    page.tsx                     # dashboard
    orders/page.tsx              # order queue
    orders/[id]/page.tsx         # order detail + status/tracking
    products/page.tsx            # catalog management
    products/[id]/page.tsx       # product editor
  api/
    health/route.ts
    payment/webhook/route.ts     # mock now; Stripe later
components/
lib/
  db.ts            # Prisma client singleton
  auth.ts          # NextAuth config
  cart.ts          # cart server logic
  payment/         # PaymentProvider interface + mock + (future) stripe
  mail/            # mailer + templates
  validation/      # zod schemas
  money.ts         # cents <-> display helpers
prisma/
  schema.prisma
  migrations/
  seed.ts
testrigor/         # E2E test cases & rules (see §13)
```

---

## 4. Data model

All money stored as **integer cents** (`Int`). All timestamps UTC. Prisma schema (authoritative shape — adjust field types as needed but keep names stable for QA):

```prisma
// prisma/schema.prisma (abridged — implement fully)

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  name          String?
  role          Role     @default(CUSTOMER)
  addresses     Address[]
  orders        Order[]
  createdAt     DateTime @default(now())
}

enum Role { CUSTOMER ADMIN }

model Category {
  id        String    @id @default(cuid())
  name      String
  slug      String    @unique
  products  Product[]
  createdAt DateTime  @default(now())
}

model Product {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  description String
  priceCents  Int                      // USD cents
  currency    String   @default("USD")
  imageUrl    String
  stock       Int      @default(0)
  active      Boolean  @default(true)   // hidden from storefront if false
  categoryId  String
  category    Category @relation(fields: [categoryId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([categoryId])
}

model Cart {
  id        String     @id @default(cuid())
  userId    String?                     // null for guest carts
  items     CartItem[]
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
}

model CartItem {
  id         String  @id @default(cuid())
  cartId     String
  cart       Cart    @relation(fields: [cartId], references: [id], onDelete: Cascade)
  productId  String
  product    Product @relation(fields: [productId], references: [id])
  quantity   Int
  @@unique([cartId, productId])
}

model Address {
  id         String  @id @default(cuid())
  userId     String?
  user       User?   @relation(fields: [userId], references: [id])
  fullName   String
  line1      String
  line2      String?
  city       String
  state      String
  postalCode String
  country    String  @default("US")
  phone      String?
}

model Order {
  id              String       @id @default(cuid())
  orderNumber     String       @unique           // human-facing, e.g. "ORD-2026-000123"
  userId          String?                         // null for guest orders
  user            User?        @relation(fields: [userId], references: [id])
  email           String                          // contact email (guest or user)
  items           OrderItem[]
  status          OrderStatus  @default(PENDING)
  // money snapshot
  subtotalCents   Int
  shippingCents   Int
  taxCents        Int
  totalCents      Int
  currency        String       @default("USD")
  // addresses snapshot (denormalized at purchase time)
  shipping        Json                            // {fullName,line1,line2,city,state,postalCode,country,phone}
  billing         Json
  // payment
  paymentStatus   PaymentStatus @default(UNPAID)
  paymentRef      String?                         // mock txn id; later Stripe id
  // fulfillment
  trackingNumber  String?
  carrier         String?
  // audit
  events          OrderEvent[]
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  @@index([status])
  @@index([email])
}

model OrderItem {
  id          String  @id @default(cuid())
  orderId     String
  order       Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId   String
  productName String                  // snapshot — survives product edits/deletes
  priceCents  Int                     // snapshot of unit price
  quantity    Int
}

model OrderEvent {
  id        String   @id @default(cuid())
  orderId   String
  order     Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  type      String                   // "STATUS_CHANGE", "EMAIL_SENT", "PAYMENT", "NOTE"
  message   String
  createdAt DateTime @default(now())
}

enum OrderStatus { PENDING PAID PROCESSING SHIPPED DELIVERED CANCELLED REFUNDED }
enum PaymentStatus { UNPAID PAID FAILED REFUNDED }
```

**Snapshotting rule:** `OrderItem.productName`, `OrderItem.priceCents`, and `Order.shipping/billing` are copied at purchase time. Editing or deleting a product must never alter a historical order.

---

## 5. Storefront — functional requirements

### 5.1 Home page (`/`)
- Shows featured/active products and a list of categories.
- Global header on every storefront page: logo/home link, **search box**, **categories** nav, **cart** indicator showing item count.

### 5.2 Browse by category (`/category/[slug]`)
- Lists active products in that category with name, image, price.
- Shows the category name as an `<h1>`. Empty category shows a clear "No products in this category" message.
- Each product card links to its PDP and has an **Add to Cart** affordance.

### 5.3 Search (`/search?q=...`)
- Case‑insensitive match on product **name** and **description**.
- Results page shows the query back to the user (e.g. "Results for "mouse"") and the count.
- **Empty query** → prompt to enter a search term, no results listed.
- **No matches** → "No products found for "xyz"" message, no error.
- Inactive/out‑of‑catalog products never appear in results.

### 5.4 Product detail page (`/product/[slug]`)
- Shows name, full description, price, image, stock/availability, category link.
- **Add to Cart** with quantity selector (default 1, min 1, max = stock).
- Out‑of‑stock products show "Out of stock" and disable Add to Cart.
- Unknown slug → 404 page.

### 5.5 Cart (`/cart`)
- Lists line items: product name, unit price, quantity (editable), line total, remove button.
- Shows subtotal. Quantity changes and removals update totals immediately.
- Quantity cannot exceed stock or go below 1 (removing is the way to reach 0).
- Empty cart shows "Your cart is empty" with a link back to shopping.
- **Proceed to Checkout** button (disabled/hidden when cart is empty).
- Cart persists across page reloads via the `cartId` cookie. On login, a guest cart merges into the user's cart (sum quantities, cap at stock).

### 5.6 Checkout (`/checkout`)
Single page (or short stepper) collecting, in order:

1. **Contact** — email (required; pre‑filled if logged in).
2. **Shipping address** — full name, line1, line2 (optional), city, state, postal code, country, phone (optional).
3. **Billing address** — same fields, with a **"Same as shipping"** checkbox that copies shipping.
4. **Payment** — mock card form (see §7): Full Name, Credit Card, Expiration, CRC.
5. **Order summary** — line items, subtotal, shipping, tax, **total**.

Rules:
- **All required fields must be filled** or the order is blocked with inline validation; the page stays on `/checkout` and shows which fields are missing.
- Server **re‑validates** every field (Zod) and **re‑prices** the order from the DB — never trust client‑sent prices.
- Stock is re‑checked at submission; if an item went out of stock, block with a clear message and update the cart.
- On success: create `Order` (status `PAID`, paymentStatus `PAID`), decrement stock, clear the cart, send confirmation emails, redirect to confirmation.

**Pricing rules (v1):**
- `shippingCents` = flat **$5.00** (configurable via env `SHIPPING_FLAT_CENTS`), free over `FREE_SHIPPING_THRESHOLD_CENTS` (default $50.00).
- `taxCents` = `round(subtotal * TAX_RATE)`, `TAX_RATE` default `0.08` (env).
- `totalCents` = subtotal + shipping + tax.

### 5.7 Order confirmation (`/checkout/confirmation/[orderNumber]`)
- Shows "Thank you for your purchase!" (this exact phrase — QA asserts on it), the order number, an itemized summary, totals, and the shipping address.
- Notes that a confirmation email has been sent.

### 5.8 Order lookup & history
- **Guest** (`/orders/lookup`): enter order number + email → see status, items, tracking (if any).
- **Customer** (`/account`): list of their orders with status; click into order detail.

### 5.9 Customer accounts (optional)
- `/account/register` — email, password, name. `/account/login` — email/password.
- Registration/login is **never required to purchase**. Logged‑in users get pre‑filled checkout email, saved addresses, and order history.

---

## 6. Back office (`/admin`) — functional requirements

### 6.1 Admin login (`/admin/login`)
- Email/password (NextAuth credentials). Only `role = ADMIN` may proceed.
- Wrong credentials → inline error, stays on login. Non‑admin session hitting `/admin/**` → redirect to login / 403.

### 6.2 Dashboard (`/admin`)
- At‑a‑glance counts: orders by status (e.g. "3 Pending", "2 Processing"), today's order count, low‑stock products.

### 6.3 Orders queue (`/admin/orders`)
- Table of all orders: order number, date, customer email, total, **status badge**, tracking (if set).
- Filter by status; search by order number or email; sort by date. Newest first by default.

### 6.4 Order detail & fulfillment (`/admin/orders/[id]`)
- Full order: items, totals, contact email, shipping & billing addresses, payment status, event log.
- **Update status** via the allowed transitions (see §8). Each change writes an `OrderEvent` and may send a customer email.
- **Set tracking number + carrier.** Setting tracking is required to move an order to `SHIPPED`. Saving tracking on a `SHIPPED`/`PROCESSING` order sends the "shipped" email with the tracking number.
- **Cancel order** (allowed from `PENDING`/`PAID`/`PROCESSING`): restocks items, sets `CANCELLED`, sends cancellation email.
- Add an internal **note** (writes an `OrderEvent`, not emailed).

### 6.5 Catalog management
- `/admin/products` — list products with stock, price, active flag; create new.
- `/admin/products/[id]` — edit name, slug, description, price, image URL, stock, category, active. Validation: price ≥ 0, stock ≥ 0, slug unique.
- Toggling `active=false` removes a product from the storefront immediately but preserves it in historical orders.

---

## 7. Payment (mock, swappable)

Define a provider interface; ship a mock implementation now.

```ts
// lib/payment/types.ts
export interface PaymentProvider {
  charge(input: {
    amountCents: number; currency: string; orderNumber: string;
    card: { number: string; expiration: string; crc: string; name: string };
  }): Promise<{ ok: true; ref: string } | { ok: false; reason: string }>;
}
```

**Mock provider rules (`lib/payment/mock.ts`):**
- Test card `4111 1111 1111 1111` (any spacing) with any non‑empty expiration/CRC/name → **approve**, return `ref = "MOCK-<orderNumber>"`.
- Card `4000 0000 0000 0002` → **decline** (lets QA test the failure path) with reason "Card declined".
- Empty/missing card fields → validation error before reaching the provider.
- No real network calls, no card data persisted beyond `paymentRef`.

The selection is via `PAYMENT_PROVIDER=mock|stripe` env. `api/payment/webhook` exists now as a no‑op acknowledgement so the Stripe swap is purely additive.

> **Security:** never log full card numbers; never store PAN/CRC. Treat card fields as transient request data only.

---

## 8. Order state machine

```
PENDING ──pay──▶ PAID ──start fulfillment──▶ PROCESSING ──ship(+tracking)──▶ SHIPPED ──▶ DELIVERED
   │               │                              │
   └──────────── CANCELLED ◀──────────────────────┘            (REFUNDED reachable from PAID/SHIPPED/DELIVERED)
```

Allowed transitions (enforced server‑side; reject anything else):

| From | To | Side effects |
|------|----|--------------|
| (new) | PENDING | order created (pre‑payment, rarely used since checkout pays immediately) |
| PENDING / (checkout) | PAID | payment captured, stock decremented, **confirmation email** |
| PAID | PROCESSING | **"order is being processed" email** (optional, configurable) |
| PROCESSING / PAID | SHIPPED | requires `trackingNumber` + `carrier`; **"shipped" email with tracking** |
| SHIPPED | DELIVERED | **"delivered" email** (optional) |
| PENDING / PAID / PROCESSING | CANCELLED | restock items, **cancellation email** |
| PAID / SHIPPED / DELIVERED | REFUNDED | mark refunded, **refund email** |

Every transition appends an `OrderEvent`. Emails that fail to send are logged as an `OrderEvent` of type `EMAIL_SENT` with the error; failure to email must **not** roll back the status change.

---

## 9. Email notifications

Sent via Nodemailer. From address from `MAIL_FROM`. In dev, use a console/stream transport that prints the email (so QA and devs can read it without a real inbox); in prod, SMTP from env.

| Trigger | To | Subject (template) | Key content |
|---------|----|--------------------|-------------|
| Order placed/paid | customer | `Order ORD-… confirmed` | items, totals, shipping address, order number |
| Order placed | **owner** (`OWNER_EMAIL`) | `New order ORD-…` | items, total, customer email — so the owner knows to fulfill |
| Status → PROCESSING | customer | `Your order ORD-… is being processed` | reassurance + order number |
| Status → SHIPPED | customer | `Your order ORD-… has shipped` | **carrier + tracking number**, items |
| Status → DELIVERED | customer | `Your order ORD-… was delivered` | order number |
| Status → CANCELLED | customer | `Your order ORD-… was cancelled` | reason if provided |
| Account registered | customer | `Welcome` | optional |

Requirements:
- Emails are **idempotent per transition** (don't double‑send on retry).
- All emails include the order number in both subject and body (QA matches on it).
- Sending is best‑effort and asynchronous to the request where possible; never block the user's confirmation page on SMTP latency beyond a short timeout.

---

## 10. API & routes reference

### 10.1 Pages (see §3.3 for the full tree)
Storefront: `/`, `/search`, `/category/[slug]`, `/product/[slug]`, `/cart`, `/checkout`, `/checkout/confirmation/[orderNumber]`, `/orders/lookup`, `/account*`.
Admin: `/admin/login`, `/admin`, `/admin/orders`, `/admin/orders/[id]`, `/admin/products`, `/admin/products/[id]`.

### 10.2 Route handlers (`app/api`)
| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/api/health` | Liveness probe → `{ ok: true }` | none |
| POST | `/api/payment/webhook` | Payment provider callback (no‑op for mock) | provider signature (future) |

### 10.3 Server actions (primary mutation surface)
- `addToCart(productId, qty)`, `updateCartItem(itemId, qty)`, `removeCartItem(itemId)`
- `placeOrder(checkoutPayload)` → validates, prices, charges, creates order, emails, returns `orderNumber`
- `registerCustomer`, (login/logout via NextAuth)
- Admin: `updateOrderStatus(orderId, status)`, `setTracking(orderId, carrier, trackingNumber)`, `cancelOrder(orderId, reason?)`, `addOrderNote(orderId, note)`, `upsertProduct(payload)`, `setProductActive(id, active)`

All actions: Zod‑validate input, check auth/role, run in a transaction where multiple rows change (e.g. order + stock decrement + cart clear).

---

## 11. Non‑functional requirements

- **Performance:** catalog/PDP/category pages server‑rendered; LCP < 2.5s on a mid‑tier connection. Use `next/image`.
- **Accessibility:** semantic HTML, labeled form inputs (visible `<label>` tied to each input — **required**, since QA matches fields by visible label, see §13), keyboard‑navigable, sufficient contrast. Target WCAG 2.1 AA for core flows.
- **Responsive:** works on mobile, tablet, desktop.
- **Security:** server‑side authz on every admin/customer action; passwords hashed (bcrypt/argon2); CSRF protection on forms (NextAuth/Next built‑ins); no secrets in client bundles; rate‑limit login and checkout; never trust client prices; validate & sanitize all input.
- **Reliability:** money in integer cents; order creation atomic (transaction); idempotent emails; graceful 404/500 pages.
- **Observability:** structured server logs for order placement, status changes, payment results, and email sends (the `OrderEvent` log is the audit trail).
- **Privacy:** store only what's needed; never persist card PAN/CRC.

---

## 12. Configuration (environment variables)

| Var | Purpose | Example / default |
|-----|---------|-------------------|
| `DATABASE_URL` | Postgres connection | `postgres://…` |
| `NEXTAUTH_SECRET` | Session signing | random |
| `NEXTAUTH_URL` | Base URL | `http://localhost:3000` |
| `PAYMENT_PROVIDER` | `mock` \| `stripe` | `mock` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | SMTP transport | — |
| `MAIL_FROM` | From address | `store@example.com` |
| `OWNER_EMAIL` | Owner notification inbox | `owner@example.com` |
| `SHIPPING_FLAT_CENTS` | Flat shipping | `500` |
| `FREE_SHIPPING_THRESHOLD_CENTS` | Free‑shipping floor | `5000` |
| `TAX_RATE` | Tax rate | `0.08` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Seed owner account | set in seed |

Provide `.env.example` with every var. Never commit real secrets.

### 12.1 Seed data (`prisma/seed.ts`)
- One **ADMIN** user from `ADMIN_EMAIL`/`ADMIN_PASSWORD`.
- 3–5 **categories** and ~12–20 **products** across them, with images, prices, and stock (include at least one out‑of‑stock and one inactive product for QA).
- Idempotent (safe to re‑run).

---

## 13. QA strategy (testRigor)

QA is automated with **testRigor** plain‑English E2E tests driven from this repo. The tooling and conventions are documented in the bundled skills — **read these before writing or running tests**:

- `.skills/testrigor-dev-loop/SKILL.md` — the build → run → debug loop (tests as code, localhost tunnel).
- `.skills/testrigor-write-tests/SKILL.md` (+ `reference.md`, `examples.md`, `api-testing.md`) — the plain‑English language and on‑disk file formats.
- `.skills/testrigor-cli/SKILL.md` — every CLI flag, auth, JUnit reporting.
- Worked examples: `.skills/testrigor-dev-loop/examples/shop-checkout/` (checkout + negative tests, the closest template) and `.../simple-search/`.

### 13.1 Layout in this repo
```
testrigor/
  test-cases/          # one file per scenario (.txt or .yaml); filename = test name
  rules/               # reusable rules (e.g. add-to-cart, fill-checkout-form)
  variables.json       # test data (emails, test card, addresses)
  settings.yaml        # optional
  .run/                # JUnit reports (gitignored)
```

### 13.2 Authoring rules QA must follow (and Engineering must enable)
- Tests refer to elements by **visible text/label** — so Engineering **must** give every form field a visible `<label>` and use the exact button/heading captions listed below. Renaming a caption is a breaking change; update tests in the same PR.
- Assert the **consequence**, not just navigation (an order number, the "Thank you for your purchase!" text, a sent email), per the skill's "avoid false passes" guidance.
- Include **negative tests** (empty/missing fields blocked) alongside happy paths.
- Don't `open url` the app under test; the suite URL / `--url` opens it.

### 13.3 Stable captions/phrases (contract between code and tests)
Engineering must keep these exact strings (QA asserts on them; changing one requires updating the matching test):

| Where | Exact text |
|-------|-----------|
| PDP add button | `Add to Cart` |
| Cart → checkout | `Proceed to Checkout` |
| Checkout submit | `Place Order` |
| Confirmation heading | `Thank you for your purchase!` |
| Order number format | `ORD-####-######` |
| Search results | `Results for "<query>"` |
| Empty search results | `No products found` |
| Out of stock | `Out of stock` |
| Checkout field labels | `Email address`, `Full Name`, `Address line 1`, `City`, `State`, `Postal code`, `Country`, `Credit Card`, `Expiration`, `CRC` |
| Admin status control | `Update Status` |
| Admin tracking fields | `Carrier`, `Tracking Number` |

### 13.4 Required test scenarios (acceptance suite)

**Storefront — happy paths**
1. Home lists products and categories.
2. Browse a category → see its products.
3. Search by name → results shown with the query echoed; click a result → PDP.
4. PDP shows details; Add to Cart updates the cart count.
5. Cart: update quantity and remove item update totals; Proceed to Checkout.
6. Full guest checkout: list → product → add → checkout → fill shipping+billing+payment → Place Order → "Thank you for your purchase!" + an order number is shown.
7. Confirmation email received by the buyer (`check that email … was received`).
8. Registered‑customer checkout with pre‑filled email; order appears in `/account` history.
9. Guest order lookup by order number + email shows the order and its status.

**Storefront — negative / edge**
10. Empty search → prompt, no results.
11. Search with no matches → "No products found".
12. Checkout with a **missing required field** (e.g. empty Expiration) is **blocked**; stays on checkout; no "Thank you" page.
13. Checkout with a completely **empty form** is blocked.
14. Declined test card (`4000…0002`) → checkout shows a payment error, no order created.
15. Out‑of‑stock product: Add to Cart disabled / not purchasable.

**Back office**
16. Admin login required: anonymous visit to `/admin/orders` redirects to login.
17. Admin logs in and sees the order placed in scenario 6 in the queue.
18. Admin opens the order, sets carrier + tracking number, moves status to **Shipped** → status badge updates and the **shipped email with tracking** is received by the buyer.
19. Admin cancels an order → status Cancelled, item restocked, cancellation email received.
20. Non‑admin (customer) cannot reach `/admin` (redirected/403).

**Smoke subset** (label `smoke`): scenarios 1, 3, 4, 6, 16, 18 — run on every PR/preview deploy.

### 13.5 Running (per the dev‑loop skill)
Against a local dev server through the tunnel:
```bash
mkdir -p testrigor/.run
testrigor test-suite run "$SUITE" \
  --localhost --url "http://localhost:3000" \
  --test-cases-path "testrigor/test-cases/**/*.{txt,yaml,yml}" \
  --rules-path "testrigor/rules/**/*.{txt,yaml,yml}" \
  --variables-path testrigor/variables.json \
  --explicit-mutations \
  --junit-report-save-path testrigor/.run/report.xml
```
Against a Vercel preview deploy (CI gate): drop `--localhost`, point `--url` at the preview URL, filter `--labels smoke`. Use `TESTRIGOR_API_KEY` (env secret) for auth; sync mode so the exit code gates the job.

### 13.6 Definition of Done (per feature)
A feature is done when: it meets its §5/§6 requirements; server‑side validation/authz is in place; the relevant §13.4 testRigor scenario(s) pass (`failures="0"`); the stable captions in §13.3 are present; and this spec is updated if any contract changed.

---

## 14. Milestones (suggested build order)

| # | Milestone | Includes |
|---|-----------|----------|
| M0 | Project setup | Next.js + TS + Tailwind, Prisma + Postgres, NextAuth, env scaffolding, `/api/health`, seed |
| M1 | Catalog & browse | Home, category, PDP, search; seed catalog; tests 1–4, 10, 11, 15 |
| M2 | Cart | Cart cookie/session, add/update/remove, totals; test 5 |
| M3 | Checkout & payment | Checkout form, pricing, mock payment, order creation, confirmation; tests 6, 12, 13, 14 |
| M4 | Email | Nodemailer, confirmation + owner notification; test 7 |
| M5 | Accounts | Register/login, history, guest lookup, cart merge; tests 8, 9 |
| M6 | Back office | Admin auth, order queue/detail, status machine, tracking, cancel, catalog mgmt, status emails; tests 16–20 |
| M7 | Hardening | Accessibility, rate limiting, error pages, full regression suite green on preview deploy |

---

## 15. Open questions / future work
- Swap mock payment → Stripe (provider interface already in place; add webhook verification).
- Real tax/shipping engines; discount codes; product reviews; inventory reservations during checkout; address validation; refunds via provider; pagination/infinite scroll for large catalogs; full‑text/search service if catalog grows.
```
