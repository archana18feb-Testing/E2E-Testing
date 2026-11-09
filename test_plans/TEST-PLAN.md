# Practice Software Testing - Toolshop Test Plan

## Purpose

Document manual and automated coverage for the public Toolshop demo at
`https://practicesoftwaretesting.com/`. The matching Playwright tests are in
`E2EToolShade-testing.spec.js` and `filters.spec.ts`.

## Scope

- Product search and no-result behavior
- Category and brand filters and product sorting
- Product details and quantity limits
- Out-of-stock restrictions
- Adding products to the cart and verifying the total
- Guest checkout validation
- Login failure and successful customer login

## Test environment and prerequisites

- A current Chromium browser and Node.js/npm
- Dependencies installed with `npm install`
- Internet access to the demo website
- Optional: valid demo customer credentials for the authenticated checkout case

The test base URL defaults to the public site. Override it with `PST_BASE_URL`
when using another compatible test environment. Set `PST_CUSTOMER_EMAIL` and
`PST_CUSTOMER_PASSWORD` to run the authenticated checkout test.

## Test cases

| ID | Area | Type | Scenario | Expected result |
|---|---|---|---|---|
| PST-01 | Search | Happy path and negative | Search for `Pliers`, then search for a query that should not match a product. | Matching products are displayed for `Pliers`; the unknown query displays no product cards. |
| PST-02 | Filters and sorting | Happy path and edge case | Select Hand Tools and ForgeFlex Tools, then sort by ascending price. | Both filters remain selected and the displayed product prices are in ascending order. |
| PST-03 | Product details | Happy path and edge case | Open an in-stock product and inspect its information and quantity controls. | Product name, price, and specifications are visible; quantity starts at one, cannot decrease below one, and can increase to two. |
| PST-04 | Stock restriction | Negative | Open a product marked out of stock. | The Add to cart control is disabled. Skip this case if the catalog currently has no out-of-stock product. |
| PST-05 | Cart | Happy path | Add an in-stock product and open checkout. | The product appears in the cart and a currency total is displayed. |
| PST-06 | Guest checkout | Negative and happy path | Submit guest checkout without details, then provide an email and name and continue. | Empty details do not advance checkout; valid contact details allow progression to billing. Billing cannot proceed until its required fields are filled. |
| PST-07 | Login | Negative | Submit invalid email/password credentials. | The user remains on the login page and is not authenticated. |
| PST-08 | Authenticated checkout | Happy path | Add a product, choose sign-in during checkout, and submit valid customer credentials. | Authentication succeeds and the billing address step is displayed. Requires `PST_CUSTOMER_EMAIL` and `PST_CUSTOMER_PASSWORD`; otherwise skipped. |

## Running the automated test plan

From the project root, run all specs stored in this `test_plans` folder:

```powershell
npx playwright test --config=playwright.test-plans.config.js
```

Run only the full workflow spec:

```powershell
npx playwright test --config=playwright.test-plans.config.js test_plans/E2EToolShade-testing.spec.js
```

Run only the filter spec:

```powershell
npx playwright test --config=playwright.test-plans.config.js test_plans/filters.spec.ts
```

## Notes

- Product catalog data can change. Tests select an available in-stock product
  from the current catalog instead of depending on a fixed product identifier.
- The out-of-stock case is skipped if no such item is currently listed.
- Successful login depends on credentials supplied by the test environment.
- These scenarios cover the current public demo behavior and are not an
  exhaustive test of every checkout payment method or every filter combination.
