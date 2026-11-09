const { expect, test } = require('@playwright/test');

const baseUrl =
    process.env.PST_BASE_URL || 'https://practicesoftwaretesting.com';

async function openFirstInStockProduct(page) {
    await page.goto(baseUrl);
    const productLink = page
        .locator('a[href^="/product/"]')
        .filter({ hasNotText: /Out of stock/i })
        .first();
    await expect(productLink).toBeVisible();
    const productName = (await productLink.innerText()).split('\n')[0].trim();
    await productLink.click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(productName);
    await expect(page.locator('#btn-add-to-cart')).toBeEnabled();
    return productName;
}

async function addFirstProductToCart(page) {
    const productName = await openFirstInStockProduct(page);
    await page.locator('#btn-add-to-cart').click();
    await expect(page.locator('[aria-label="cart"]')).toContainText('1');
    return productName;
}

test.describe('Practice Software Testing - Toolshop test plan', () => {
    test('happy path: search returns matching products and no results for an unknown query', async ({
        page,
    }) => {
        await page.goto(baseUrl);

        await page.locator('#search-query').fill('Pliers');
        await page.locator('[data-test="search-submit"]').click();
        await expect(
            page
                .locator('a[href^="/product/"]')
                .filter({ hasText: /Pliers/i })
                .first(),
        ).toBeVisible();

        await page.locator('#search-query').fill('no-such-tool-987654');
        await page.locator('[data-test="search-submit"]').click();
        await expect(page.locator('a[href^="/product/"]')).toHaveCount(0);
    });

    test('happy path and edge: category and brand filters combine and price sorting is ascending', async ({
        page,
    }) => {
        await page.goto(baseUrl);
        await page.getByLabel('Hand Tools', { exact: true }).check();
        await page.getByLabel('ForgeFlex Tools', { exact: true }).check();
        await expect(page.getByLabel('Hand Tools', { exact: true })).toBeChecked();
        await expect(
            page.getByLabel('ForgeFlex Tools', { exact: true }),
        ).toBeChecked();
        await page.waitForLoadState('networkidle');
        await page.getByLabel('sort').selectOption('price,asc');
        await page.waitForLoadState('networkidle');

        await expect
            .poll(async () => {
                const prices = await page
                    .locator('a[href^="/product/"]')
                    .evaluateAll((products) =>
                        products
                            .map((product) =>
                                Number(
                                    product.textContent?.match(
                                        /\$(\d+(?:\.\d{2})?)/,
                                    )?.[1],
                                ),
                            )
                            .filter(Number.isFinite),
                    );
                return (
                    prices.length > 1 &&
                    prices.every(
                        (price, index) => index === 0 || prices[index - 1] <= price,
                    )
                );
            })
            .toBe(true);
    });

    test('happy path and edge: product details are shown and quantity cannot decrease below one', async ({
        page,
    }) => {
        const productName = await openFirstInStockProduct(page);

        await expect(page.getByText(/\$\d+\.\d{2}/).first()).toBeVisible();
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(
            productName,
        );
        await expect(
            page.getByRole('heading', { name: 'Specifications' }),
        ).toBeVisible();
        const quantity = page.getByRole('spinbutton', { name: 'Quantity' });
        await expect(quantity).toHaveValue('1');

        await page.getByRole('button', { name: 'Decrease quantity' }).click();
        await expect(quantity).toHaveValue('1');
        await page.getByRole('button', { name: 'Increase quantity' }).click();
        await expect(quantity).toHaveValue('2');
    });

    test('negative: an out-of-stock product cannot be added to the cart', async ({
        page,
    }) => {
        await page.goto(baseUrl);
        const outOfStockProduct = page
            .locator('a[href^="/product/"]')
            .filter({ hasText: 'Out of stock' })
            .first();
        if ((await outOfStockProduct.count()) === 0) {
            test.skip(
                true,
                'No out-of-stock product is currently displayed in the catalog.',
            );
            return;
        }

        await outOfStockProduct.click();
        await expect(
            page.getByRole('heading', { name: /.+/, level: 1 }),
        ).toBeVisible();
        await expect(page.locator('#btn-add-to-cart')).toBeDisabled();
    });

    test('happy path: adding a product updates the cart and its total', async ({
        page,
    }) => {
        const productName = await addFirstProductToCart(page);
        await page.goto(`${baseUrl}/checkout`);

        await expect(
            page.getByRole('row').filter({ hasText: productName }),
        ).toBeVisible();
        await expect(
            page.getByRole('row').filter({ hasText: 'Total' }).last(),
        ).toContainText(/\$\d+\.\d{2}/);
    });

    test('negative and happy path: guest checkout requires contact details before billing', async ({
        page,
    }) => {
        await addFirstProductToCart(page);
        await page.goto(`${baseUrl}/checkout`);
        await page.getByRole('button', { name: 'Proceed to checkout' }).click();
        await page.getByRole('tab', { name: 'Continue as Guest' }).click();

        await page.locator('[data-test="guest-submit"]').click();
        await expect(page.locator('#guest-email')).toBeVisible();

        await page.locator('#guest-email').fill('guest@example.com');
        await page.locator('#guest-first-name').fill('Taylor');
        await page.locator('#guest-last-name').fill('Tester');
        await page.locator('[data-test="guest-submit"]').click();

        await expect(
            page.getByText('Continuing as guest: Taylor Tester'),
        ).toBeVisible();
        await page.getByRole('button', { name: 'Proceed to checkout' }).click();
        await expect(page.locator('#postal_code')).toBeVisible();
        await expect(page.locator('[data-test="proceed-3"]')).toBeDisabled();
    });

    test('negative: invalid credentials do not authenticate a user', async ({
        page,
    }) => {
        await page.goto(`${baseUrl}/auth/login`);
        await page.locator('#email').fill('invalid-user@example.com');
        await page.locator('#password').fill('incorrect-password');
        await page.locator('[data-test="login-submit"]').click();

        await expect(page).toHaveURL(/\/auth\/login$/);
        await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
    });

    test('happy path: customer can log in and continue checkout', async ({
        page,
    }) => {
        const email = process.env.PST_CUSTOMER_EMAIL;
        const password = process.env.PST_CUSTOMER_PASSWORD;
        if (!email || !password) {
            test.skip(
                true,
                'Set PST_CUSTOMER_EMAIL and PST_CUSTOMER_PASSWORD to run this scenario.',
            );
            return;
        }

        await addFirstProductToCart(page);
        await page.goto(`${baseUrl}/checkout`);
        await page.locator('[data-test="proceed-1"]').click();
        await page.getByRole('tab', { name: 'Sign in' }).click();
        await page.locator('#email').fill(email);
        await page.locator('#password').fill(password);
        await page.locator('[data-test="login-submit"]').click();

        await expect(page.locator('#postal_code')).toBeVisible();
    });
});
