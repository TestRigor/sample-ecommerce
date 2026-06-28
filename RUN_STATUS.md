# Build status — ALL GREEN ✅

App built per `specification.md`; testRigor suite `XystzuBo27imDkmfY` driven via the
`testrigor` CLI against `http://localhost:3000` through the tunnel.

## Test results (final)

| # | Test case | Status |
|---|-----------|--------|
| 1 | create-publish-product-find-and-add-to-cart | ✅ pass |
| 2 | guest-checkout-ship-decrements-stock | ✅ pass (5 consecutive) |
| 3 | customer-sign-up | ✅ pass |

`failures: 0 / tests: 3`. The three test files were never modified.

## Running it yourself

```bash
# 1) Start the app with mail creds loaded from ~/.zshrc (SMTP_* + MAIL_FROM)
npm run dev:mail
# 2) Run the suite
testrigor test-suite run "XystzuBo27imDkmfY" \
  --localhost --url "http://localhost:3000" \
  --test-cases-path "testrigor/test-cases/**/*.{txt,yaml,yml}" \
  --rules-path "testrigor/rules/**/*.{txt,yaml,yml}" \
  --variables-path testrigor/variables.json \
  --explicit-mutations \
  --junit-report-save-path testrigor/.run/report.xml
```

## Two non-obvious fixes that got test 2 & 3 green

### Test 3 (welcome email) — Brevo delivery
- The dev server launched by tooling does NOT source `~/.zshrc`, so the app saw no SMTP vars and
  used a non-delivering console transport (empty Brevo dashboard). Fixed with `npm run dev:mail`
  (`scripts/dev-with-mail.sh`), which loads `SMTP_*`/`MAIL_FROM` from `~/.zshrc`.
  - NB: that script must use `grep --color=never` — a colorizing grep injects ANSI escapes that break `eval`.
- Auth needed the real Brevo **SMTP key** (`xsmtpsib-…`), not the short account password (`535` otherwise).
- External delivery needed a **verified sender**: `MAIL_FROM=artem.golubev@testrigor.com`. With the
  unverified SMTP login as `From`, Brevo accepted the mail ("Sent") but never delivered it to the
  external `…@testrigor-mail.com` mailbox (a 187s diagnostic confirmed it never arrived).

### Test 2 (`grab value from "Stock"`) — competing label
- `grab value from "Stock"` returns the text of whatever element it matches as "Stock". The product
  **list** page had a `<th>Stock</th>` column header; when navigation into the editor lagged (e.g.
  a slow tunnel), the grab matched that header and returned the literal `"Stock"`, so
  `save expression "Stock - Stock"` threw `"Stock" is not defined`.
- Fix: renamed the list header to **"Inventory"** (`app/admin/products/page.tsx`) so the editor's
  stock readout (`<span title="Stock">{stock}</span>` in `ProductForm.tsx`, whose accessible name
  derives from the numeric content) is the only "Stock" the grab can match → returns the bare number.
