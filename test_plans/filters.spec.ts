import { expect, test } from '@playwright/test';

const baseUrl =
    process.env.PST_BASE_URL ?? 'https://practicesoftwaretesting.com';

test.describe('Toolshop product filters', () => {
    test('search finds matching products and returns no results for an unknown query', async ({
        page,
    }) => {
        await page.goto(baseUrl);

        await page.locator('#search-query').fill('Pliers');
        await page.locator('[data-test="search-submit"]').click();
        await expect(
            page.locator('a[href^="/product/"]').filter({ hasText: /Pliers/i }).first(),
        ).toBeVisible();

        await page.locator('#search-query').fill('no-such-tool-987654');
        await page.locator('[data-test="search-submit"]').click();
        await expect(page.locator('a[href^="/product/"]')).toHaveCount(0);
    });

    test('category and brand filters combine and products sort by ascending price', async ({
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
});
