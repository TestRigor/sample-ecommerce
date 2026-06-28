# testRigor E2E tests

Plain-English end-to-end tests for the storefront + back office described in
[`../specification.md`](../specification.md). Authored per the bundled
`testrigor-write-tests` skill; run per `testrigor-cli` / `testrigor-dev-loop`.

## Layout

```
testrigor/
  test-cases/
    create-publish-product-find-and-add-to-cart.yaml   # Scenario 1
    guest-checkout-ship-decrements-stock.yaml          # Scenario 2
    customer-sign-up.yaml                               # Scenario 3
  rules/
    admin-login.txt                                    # sign in to /admin as owner
    fill-checkout-shipping-and-payment.txt             # shipping + billing + mock card
  variables.json                                       # test data (creds, card, addresses)
```

The filename (no extension) is the test/rule name. Each test begins with an
action — the suite's start URL (or `--url`) opens automatically; we never
`open url` the storefront. The one exception is `admin-login`, which reaches
`/admin/login` through the environment's own `${homePrefix}` (there is no
storefront link to the back office), so it stays environment-agnostic.

## The three scenarios

1. **create-publish-product-find-and-add-to-cart** — owner creates a product
   with a generated unique name, marks it Active (publish), logs out; an
   anonymous shopper searches the top bar, sees `Results for "<name>"`, opens
   the PDP, clicks **Add to Cart**, and the cart count becomes `1`.
2. **guest-checkout-ship-decrements-stock** — records a product's stock from the
   editor, runs a full guest checkout (asserts `Thank you for your purchase!`
   and captures the `ORD-####-######` number), confirms the back-office order
   queue shows that order as **Paid** (awaiting shipment), sets Carrier +
   Tracking Number and moves it to **Shipped**, then re-reads stock and asserts
   it dropped by exactly the 1 unit sold.
3. **customer-sign-up** — a new visitor registers with a generated unique email,
   lands signed-in on the account area, and receives the welcome email.

## Before you run

Edit `variables.json`:

- `adminEmail` / `adminPassword` — must match the seeded `ADMIN_EMAIL` /
  `ADMIN_PASSWORD` owner account.
- `checkoutProductName` — must be a seeded, **active, in-stock** product (the
  search must resolve to exactly one PDP). Defaults to `Wireless Mouse`.
- `newProductCategory` — must be an existing category option.
- `cardNumber` is the mock provider's approved test card (`4111 1111 1111 1111`).

## Caption / label assumptions

These match the **stable captions** in spec §13.3 and are asserted verbatim:
`Add to Cart`, `Proceed to Checkout`, `Place Order`, `Thank you for your
purchase!`, `ORD-####-######`, `Results for "<query>"`, the checkout field
labels, `Carrier`, `Tracking Number`. If Engineering renames one, update the
matching test in the same PR.

A few captions are **not** pinned in §13.3 and were chosen reasonably — adjust
if the implementation differs:

- Admin nav / actions: `Products`, `Orders`, `New Product`, `Save`, `Active`,
  the `Update Status` control, and the `Dashboard` landing word.
- Admin login fields: `Email address`, `Password`, button `Sign in`.
- Storefront cart indicator matched as `"Cart"`.
- Account: header `Account`, `Register`, `Create account` button, register
  fields `Full Name` / `Password`, and the `My Account` landing word.

## Running (local dev via the tunnel)

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

All three carry the `smoke` label, so a CI gate against a preview deploy can
filter with `--labels smoke`. See the `testrigor-cli` skill for auth and flags.
